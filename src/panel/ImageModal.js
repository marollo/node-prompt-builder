/**
 * Manages the generated image modal overlay.
 * Shown automatically after a successful fal.ai generation.
 */

// The modal DOM element — created once, reused for every generation
let _modalEl = null

/**
 * Builds the modal HTML and appends it to the page body.
 * Called the first time showImage() is invoked.
 */
function buildModal() {
  const overlay = document.createElement('div')
  overlay.id = 'image-modal'

  overlay.innerHTML = `
    <div id="image-modal-box">
      <div id="image-modal-toolbar">
        <button id="image-modal-close">✕</button>
      </div>
      <div id="image-modal-grid"></div>
    </div>
  `

  document.body.appendChild(overlay)

  // Close when clicking the ✕ button
  overlay.querySelector('#image-modal-close').addEventListener('click', closeModal)

  // Close when clicking the dark backdrop outside the image box
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })

  return overlay
}

/**
 * Shows the modal with all generated images in a grid.
 * Accepts an array of { url, label } objects.
 * label is shown under the image — used for batch mode to identify the format.
 * label can be null for single generations.
 * Called by apiClient.js after a successful generation.
 */
function showImage(items) {
  if (!_modalEl) _modalEl = buildModal()

  const grid = _modalEl.querySelector('#image-modal-grid')
  grid.innerHTML = ''

  for (const item of items) {
    const block = document.createElement('div')
    block.className = 'image-modal-item'

    const img = document.createElement('img')
    img.src = item.url
    img.alt = item.label || 'Generated image'
    img.className = 'image-modal-thumb'

    const link = document.createElement('a')
    link.href = item.url
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = 'Open full size ↗'
    link.className = 'image-modal-link'

    block.appendChild(img)

    // Show the format label (e.g. "Story Image · 1080×1920") when present
    if (item.label) {
      const labelEl = document.createElement('div')
      labelEl.className = 'image-modal-label'
      labelEl.textContent = item.label
      block.appendChild(labelEl)
    }

    block.appendChild(link)
    grid.appendChild(block)
  }

  _modalEl.style.display = 'flex'
}

/**
 * Hides the modal. Called by the close button or backdrop click.
 */
function closeModal() {
  if (_modalEl) _modalEl.style.display = 'none'
}

export { showImage }
