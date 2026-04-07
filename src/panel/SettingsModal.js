/**
 * A modal dialog for the Settings button.
 * Holds the Claude API key field, the Claude model selector, and live pricing info.
 * Saves both values to localStorage so they persist across page reloads.
 */

import { CLAUDE_PRICES, DEFAULT_MODEL } from '../utils/claudePricing.js'

// localStorage keys
const STORAGE_KEY       = 'claude-api-key'
const STORAGE_MODEL_KEY = 'claude-model'

// Available Claude models shown in the dropdown — label is what the user sees
const CLAUDE_MODELS = [
  { label: 'Haiku 4.5  — fast & cheap',  value: 'claude-haiku-4-5-20251001' },
  { label: 'Sonnet 4.6 — balanced',       value: 'claude-sonnet-4-6'         },
  { label: 'Opus 4.6   — most capable',   value: 'claude-opus-4-6'           },
]

// The modal DOM element — created once, reused on every open() call
let _modalEl = null

/**
 * Builds the modal HTML and appends it to the page body.
 * Called only the first time openSettings() is invoked.
 */
function buildModal() {
  const overlay = document.createElement('div')
  overlay.id = 'settings-modal'

  const box = document.createElement('div')
  box.id = 'settings-modal-box'

  // Close button in the top-right corner of the box
  const closeBtn = document.createElement('button')
  closeBtn.id = 'settings-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', closeSettings)

  const title = document.createElement('h3')
  title.id = 'settings-modal-title'
  title.textContent = 'Settings'

  // Label + password input for the Claude API key
  const label = document.createElement('label')
  label.className = 'panel-field-label'
  label.textContent = 'Claude API Key'

  const input = document.createElement('input')
  input.id = 'settings-claude-api-key'
  input.type = 'password'
  input.className = 'panel-input'
  input.placeholder = 'sk-ant-...'

  // Load any previously saved key so the field is pre-filled on reopen
  input.value = localStorage.getItem(STORAGE_KEY) || ''

  // Save to localStorage every time the user types — no Save button needed
  input.addEventListener('input', () => {
    localStorage.setItem(STORAGE_KEY, input.value.trim())
  })

  // Label + dropdown for choosing which Claude model to call
  const modelLabel = document.createElement('label')
  modelLabel.className = 'panel-field-label'
  modelLabel.textContent = 'Claude Model'

  const select = document.createElement('select')
  select.id = 'settings-claude-model'
  select.className = 'panel-input'

  // Load the previously saved model, fall back to the default
  const savedModel = localStorage.getItem(STORAGE_MODEL_KEY) || DEFAULT_MODEL

  // Build one <option> per model — mark the saved one as selected
  for (const m of CLAUDE_MODELS) {
    const option = document.createElement('option')
    option.value = m.value
    option.textContent = m.label
    if (m.value === savedModel) option.selected = true
    select.appendChild(option)
  }

  // Small info line showing the input/output price for the currently selected model
  const priceInfo = document.createElement('div')
  priceInfo.id = 'settings-price-info'

  // Helper that fills the price line from the current dropdown value
  function updatePriceInfo() {
    const prices = CLAUDE_PRICES[select.value]
    if (!prices) { priceInfo.textContent = ''; return }
    priceInfo.textContent =
      `Input $${prices.input.toFixed(2)} / 1M tokens  ·  Output $${prices.output.toFixed(2)} / 1M tokens`
  }

  // Show pricing for the initially selected model
  updatePriceInfo()

  // Save the chosen model to localStorage whenever the user changes the dropdown
  select.addEventListener('change', () => {
    localStorage.setItem(STORAGE_MODEL_KEY, select.value)
    // Keep the pricing line in sync with the new selection
    updatePriceInfo()
  })

  modelLabel.appendChild(select)
  modelLabel.appendChild(priceInfo)
  label.appendChild(input)
  box.appendChild(closeBtn)
  box.appendChild(title)
  box.appendChild(label)
  box.appendChild(modelLabel)
  overlay.appendChild(box)
  document.body.appendChild(overlay)

  // Clicking the dark overlay behind the box also closes the modal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings()
  })

  return overlay
}

/**
 * Opens the settings modal.
 * Called when the user clicks the "Settings" button.
 */
function openSettings() {
  if (!_modalEl) _modalEl = buildModal()
  _modalEl.style.display = 'flex'
}

/**
 * Closes the settings modal.
 * Called by the ✕ button or clicking the backdrop.
 */
function closeSettings() {
  if (_modalEl) _modalEl.style.display = 'none'
}

export { openSettings }
