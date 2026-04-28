/**
 * A floating side panel that shows a node's text fields as proper multi-line
 * textareas, plus image upload slots below them.
 * For the Output node it also shows API settings and cost controls.
 * Opens when the user clicks an "Edit" button on a node.
 * Only one panel exists at a time — it is reused across all nodes.
 */

import { getSettings, getFormat } from '../api/ApiPanel.js'
import { initCostUI } from '../api/CostControl.js'
import { generate } from '../api/apiClient.js'

// The panel DOM element — created once, reused on every open() call
let panelEl = null

/**
 * Builds the panel HTML element and appends it to the page.
 * Called only the first time open() is invoked.
 */
function buildPanel() {
  const div = document.createElement('div')
  div.id = 'properties-panel'

  // Close button in the top-right corner
  const closeBtn = document.createElement('button')
  closeBtn.id = 'properties-panel-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', close)
  div.appendChild(closeBtn)

  // Empty container — filled with textareas on every open() call
  const content = document.createElement('div')
  content.id = 'properties-panel-content'
  div.appendChild(content)

  document.body.appendChild(div)
  return div
}

/**
 * Opens the panel for a given node and builds one textarea per text field.
 * Each node must define node.panelFields and node.values before calling this.
 * Called by each node's "Edit" button widget.
 */
export function open(node) {
  if (!panelEl) panelEl = buildPanel()

  // Clear any previous node's fields
  const content = panelEl.querySelector('#properties-panel-content')
  content.innerHTML = ''

  // Panel title shows the node name
  const title = document.createElement('h3')
  title.id = 'properties-panel-title'
  title.textContent = node.title
  content.appendChild(title)

  // One labeled textarea per field declared on the node (content nodes only)
  for (const field of (node.panelFields || [])) {
    const label = document.createElement('label')
    label.textContent = field.label

    const textarea = document.createElement('textarea')
    textarea.value = node.values[field.key] || ''
    textarea.readOnly = field.readonly || false
    if (field.readonly) textarea.classList.add('readonly')

    // Give the readonly prompt textarea a known ID so OutputNode can push live updates to it
    if (field.readonly && field.key === 'prompt') textarea.id = 'prompt-display'

    // Live sync — every keystroke updates the node's stored value
    textarea.addEventListener('input', () => {
      node.values[field.key] = textarea.value
    })

    content.appendChild(label)
    content.appendChild(textarea)
  }

  // Add the image upload section only for nodes that support reference images
  if (node.images !== undefined) {
    buildImageSection(node, content)
  }

  // Camera Move node gets its own settings section
  if (node.title === 'Camera Move') {
    buildCameraMoveSection(node, content)
  }

  // Model nodes get the cost settings section (budget and cooldown)
  if (node.title === 'NB2 Model' || node.title === 'Recraft V4 Pro') {
    const costContainer = document.createElement('div')
    costContainer.id = 'cost-section'
    content.appendChild(costContainer)
    initCostUI(costContainer)

    // Wire the Generate button that initCostUI just created
    document.getElementById('api-generate-btn').addEventListener('click', generate)
  }

  panelEl.style.display = 'flex'

  // Shift the New Project button left so the panel does not cover it
  const newProjectBtn = document.getElementById('new-project-btn')
  if (newProjectBtn) newProjectBtn.classList.add('panel-open')
}

/**
 * Hides the panel. Called by the close button.
 */
export function close() {
  if (panelEl) panelEl.style.display = 'none'

  // Return the New Project button to its default position
  const newProjectBtn = document.getElementById('new-project-btn')
  if (newProjectBtn) newProjectBtn.classList.remove('panel-open')
}

/**
 * Builds the API Settings section for the Output node panel.
 * Shows a Model dropdown, optional URL override, and API key field.
 * These inputs keep the same element IDs that ApiPanel.js reads from.
 */
function buildApiSection(content) {
  const section = document.createElement('div')
  section.className = 'api-settings-section'

  // Read the previously entered values so they are not lost on panel reopen
  const prevUrl    = document.getElementById('api-url')?.value    || ''
  const prevKey    = document.getElementById('api-key')?.value    || ''
  const prevFormat = document.getElementById('api-format')?.value || 'Nano Banana 2'

  section.innerHTML = `
    <div class="panel-section-title">API Settings</div>
    <label class="panel-field-label">
      Model
      <select id="api-format" class="panel-input">
        <option value="Nano Banana 2" ${prevFormat === 'Nano Banana 2' ? 'selected' : ''}>Nano Banana 2</option>
        <option value="Generic REST"  ${prevFormat === 'Generic REST'  ? 'selected' : ''}>Generic REST</option>
      </select>
    </label>
    <label class="panel-field-label">
      Endpoint URL <span class="panel-optional">(optional)</span>
      <input id="api-url" type="text" class="panel-input"
             placeholder="https://your-api.com/generate" value="${prevUrl}" />
    </label>
    <label class="panel-field-label">
      API Key
      <input id="api-key" type="password" class="panel-input"
             placeholder="sk-..." value="${prevKey}" />
    </label>
  `

  content.appendChild(section)
}

/**
 * Builds the Reference Images section and appends it to the panel content.
 * Contains the slot list, a hidden file input, and an Add Image button.
 * Called once per open() — rebuilt fresh for each node.
 */
function buildImageSection(node, content) {
  const section = document.createElement('div')
  section.className = 'image-section'

  // Section heading
  const heading = document.createElement('label')
  heading.textContent = 'Reference Images'
  section.appendChild(heading)

  // Container that holds the individual image slots — rebuilt on add/remove
  const slotsContainer = document.createElement('div')
  slotsContainer.className = 'image-slots'
  section.appendChild(slotsContainer)

  // Hidden file input — clicking "Add image" triggers this
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/jpeg,image/png,image/webp'
  fileInput.style.display = 'none'
  section.appendChild(fileInput)

  // The Add Image button — hidden when 4 images are loaded
  const addBtn = document.createElement('button')
  addBtn.className = 'add-image-btn'
  addBtn.textContent = '+ Add image'
  addBtn.addEventListener('click', () => fileInput.click())
  section.appendChild(addBtn)

  // When the user picks a file, read it as base64 and store it on the node
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      // Store the image with the node's default label — user can edit it in the panel
      node.images.push({ data: e.target.result, label: node.referenceLabel })
      renderSlots(node, slotsContainer, addBtn)
      // Reset so the same file can be re-selected next time
      fileInput.value = ''
    }
    reader.readAsDataURL(file)
  })

  // Draw the initial slots (empty on first open, filled if panel reopened)
  renderSlots(node, slotsContainer, addBtn)

  content.appendChild(section)
}

/**
 * Builds the full settings panel for the Camera Move node.
 * Shows every optional API parameter grouped into labelled sections.
 * Each input is wired directly to the node property so changes take effect
 * immediately — no Save button needed.
 */
function buildCameraMoveSection(node, content) {
  // Creates a section title divider
  function sectionTitle(text) {
    const div = document.createElement('div')
    div.className = 'panel-section-title'
    div.textContent = text
    content.appendChild(div)
  }

  // Creates a label that wraps an input element and appends it to content
  function row(labelText, inputEl, hint) {
    const label = document.createElement('label')
    label.className = 'panel-field-label'
    label.appendChild(document.createTextNode(labelText))
    if (hint) {
      const s = document.createElement('span')
      s.className = 'panel-optional'
      s.textContent = ' ' + hint
      label.appendChild(s)
    }
    label.appendChild(inputEl)
    content.appendChild(label)
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  sectionTitle('Camera')

  const promptEl = document.createElement('textarea')
  promptEl.className = 'panel-input'
  promptEl.rows = 3
  promptEl.placeholder = 'Optional text appended after the camera directive…'
  promptEl.value = node._prompt
  promptEl.addEventListener('input', () => { node._prompt = promptEl.value })
  row('Prompt', promptEl, '(optional)')

  const wideAngleEl = document.createElement('input')
  wideAngleEl.type = 'checkbox'
  wideAngleEl.checked = node._useWideAngle
  wideAngleEl.addEventListener('change', () => { node._useWideAngle = wideAngleEl.checked })
  row('Wide Angle', wideAngleEl)

  const aspectEl = document.createElement('select')
  aspectEl.className = 'panel-input'
  for (const opt of ['match_input_image', '1:1', '16:9', '4:3', '3:2', '9:16']) {
    const o = document.createElement('option')
    o.value = o.textContent = opt
    if (opt === node._aspectRatio) o.selected = true
    aspectEl.appendChild(o)
  }
  aspectEl.addEventListener('change', () => { node._aspectRatio = aspectEl.value })
  row('Aspect Ratio', aspectEl)

  // ── Generation ──────────────────────────────────────────────────────────────
  sectionTitle('Generation')

  const goFastEl = document.createElement('input')
  goFastEl.type = 'checkbox'
  goFastEl.checked = node._goFast
  goFastEl.addEventListener('change', () => { node._goFast = goFastEl.checked })
  row('Go Fast', goFastEl, '(on = 4-step Lightning, off = 40-step detailed)')

  const stepsEl = document.createElement('input')
  stepsEl.type = 'number'
  stepsEl.className = 'panel-input'
  stepsEl.min = 1
  stepsEl.max = 40
  stepsEl.placeholder = 'Leave blank to use Go Fast preset'
  stepsEl.value = node._numInferenceSteps ?? ''
  stepsEl.addEventListener('input', () => {
    node._numInferenceSteps = stepsEl.value !== '' ? parseInt(stepsEl.value) : null
  })
  row('Inference Steps', stepsEl, '(1–40, optional)')

  const seedEl = document.createElement('input')
  seedEl.type = 'number'
  seedEl.className = 'panel-input'
  seedEl.placeholder = 'Leave blank for random'
  seedEl.value = node._seed ?? ''
  seedEl.addEventListener('input', () => {
    node._seed = seedEl.value !== '' ? parseInt(seedEl.value) : null
  })
  row('Seed', seedEl, '(optional)')

  // ── LoRA ────────────────────────────────────────────────────────────────────
  sectionTitle('LoRA')

  const multipleAnglesEl = document.createElement('input')
  multipleAnglesEl.type = 'checkbox'
  multipleAnglesEl.checked = node._useMultipleAngles
  multipleAnglesEl.addEventListener('change', () => { node._useMultipleAngles = multipleAnglesEl.checked })
  row('Use Multiple Angles', multipleAnglesEl, '(default on)')

  const strengthEl = document.createElement('input')
  strengthEl.type = 'number'
  strengthEl.className = 'panel-input'
  strengthEl.min = 0
  strengthEl.max = 2
  strengthEl.step = 0.05
  strengthEl.value = node._multipleAnglesStrength
  strengthEl.addEventListener('input', () => {
    node._multipleAnglesStrength = parseFloat(strengthEl.value) || 1
  })
  row('Multiple Angles Strength', strengthEl, '(0–2)')

  const guidanceEl = document.createElement('input')
  guidanceEl.type = 'number'
  guidanceEl.className = 'panel-input'
  guidanceEl.step = 0.1
  guidanceEl.placeholder = 'Leave blank for default'
  guidanceEl.value = node._trueGuidanceScale ?? ''
  guidanceEl.addEventListener('input', () => {
    node._trueGuidanceScale = guidanceEl.value !== '' ? parseFloat(guidanceEl.value) : null
  })
  row('True Guidance Scale', guidanceEl, '(optional)')

  const loraWeightsEl = document.createElement('input')
  loraWeightsEl.type = 'text'
  loraWeightsEl.className = 'panel-input'
  loraWeightsEl.placeholder = 'HuggingFace slug or .safetensors URL'
  loraWeightsEl.value = node._loraWeights
  loraWeightsEl.addEventListener('input', () => { node._loraWeights = loraWeightsEl.value })
  row('LoRA Weights', loraWeightsEl, '(optional)')

  const loraScaleEl = document.createElement('input')
  loraScaleEl.type = 'number'
  loraScaleEl.className = 'panel-input'
  loraScaleEl.step = 0.05
  loraScaleEl.placeholder = 'Leave blank for default'
  loraScaleEl.value = node._loraScale ?? ''
  loraScaleEl.addEventListener('input', () => {
    node._loraScale = loraScaleEl.value !== '' ? parseFloat(loraScaleEl.value) : null
  })
  row('LoRA Scale', loraScaleEl, '(optional)')

  // ── Output ──────────────────────────────────────────────────────────────────
  sectionTitle('Output')

  const formatEl = document.createElement('select')
  formatEl.className = 'panel-input'
  for (const opt of ['webp', 'jpg', 'png']) {
    const o = document.createElement('option')
    o.value = o.textContent = opt
    if (opt === node._outputFormat) o.selected = true
    formatEl.appendChild(o)
  }
  formatEl.addEventListener('change', () => { node._outputFormat = formatEl.value })
  row('Output Format', formatEl)

  const qualityEl = document.createElement('input')
  qualityEl.type = 'number'
  qualityEl.className = 'panel-input'
  qualityEl.min = 0
  qualityEl.max = 100
  qualityEl.value = node._outputQuality
  qualityEl.addEventListener('input', () => {
    node._outputQuality = parseInt(qualityEl.value) || 95
  })
  row('Output Quality', qualityEl, '(0–100, ignored for PNG)')

  // ── Safety ──────────────────────────────────────────────────────────────────
  sectionTitle('Safety')

  const safetyEl = document.createElement('input')
  safetyEl.type = 'checkbox'
  safetyEl.checked = node._disableSafetyChecker
  safetyEl.addEventListener('change', () => { node._disableSafetyChecker = safetyEl.checked })
  row('Disable Safety Checker', safetyEl, '(default off)')
}

/**
 * Clears and redraws the list of image slots inside the panel.
 * Called after every add or remove so the UI stays in sync with node.images.
 * Each slot shows a thumbnail, a type dropdown, and a remove button.
 */
function renderSlots(node, slotsContainer, addBtn) {
  slotsContainer.innerHTML = ''

  for (let i = 0; i < node.images.length; i++) {
    const img = node.images[i]

    const slot = document.createElement('div')
    slot.className = 'image-slot'

    // The 120×120 thumbnail preview
    const thumb = document.createElement('img')
    thumb.src = img.data
    thumb.className = 'image-thumb'
    slot.appendChild(thumb)

    // Label input — lets the user describe what this specific image is for
    const labelInput = document.createElement('input')
    labelInput.type = 'text'
    labelInput.className = 'image-label-input'
    labelInput.placeholder = 'e.g. the subject, shoes to wear…'
    labelInput.value = img.label || node.referenceLabel
    labelInput.addEventListener('input', () => {
      node.images[i].label = labelInput.value
    })

// Remove button — splices this image out and redraws the list
    const removeBtn = document.createElement('button')
    removeBtn.className = 'image-remove-btn'
    removeBtn.textContent = '✕'
    removeBtn.addEventListener('click', () => {
      node.images.splice(i, 1)
      renderSlots(node, slotsContainer, addBtn)
    })

    slot.appendChild(labelInput)
    slot.appendChild(removeBtn)
    slotsContainer.appendChild(slot)
  }

  // Hide the Add button once the maximum of 4 images is reached
  addBtn.style.display = node.images.length >= 4 ? 'none' : 'block'
}
