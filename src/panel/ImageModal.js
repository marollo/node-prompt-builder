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
 * Accepts an array of image URL strings.
 * Called by apiClient.js after a successful generation.
 */
function showImage(urls) {
  if (!_modalEl) _modalEl = buildModal()

  const grid = _modalEl.querySelector('#image-modal-grid')

  // Clear any images from a previous generation
  grid.innerHTML = ''

  // Build one block per image — thumbnail + "Open full size" link below it
  for (const url of urls) {
    const block = document.createElement('div')
    block.className = 'image-modal-item'

    const img = document.createElement('img')
    img.src = url
    img.alt = 'Generated image'
    img.className = 'image-modal-thumb'

    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = 'Open full size ↗'
    link.className = 'image-modal-link'

    block.appendChild(img)
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
