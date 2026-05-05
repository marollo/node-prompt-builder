/**
 * Shows all generated images from IndexedDB in a scrollable gallery modal.
 * Opened by the Gallery button in the top-left corner of the canvas.
 * Reads directly from the gallery store — independent of the current canvas state.
 */

import { loadAllFromGallery } from '../utils/galleryStore.js'

// The modal DOM element — created once, reused on every open
let _modalEl = null

/**
 * Builds the modal HTML and appends it to the page body.
 * Called only the first time openGallery() is invoked.
 */
function buildModal() {
  const overlay = document.createElement('div')
  overlay.id = 'gallery-modal'

  overlay.innerHTML = `
    <div id="gallery-modal-box">
      <div id="gallery-modal-header">
        <span id="gallery-modal-title">Gallery</span>
        <button id="gallery-modal-close">✕</button>
      </div>
      <div id="gallery-modal-grid"></div>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.querySelector('#gallery-modal-close').addEventListener('click', closeGallery)

  // Close when clicking the dark backdrop outside the box
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeGallery()
  })

  return overlay
}

/**
 * Formats a Unix timestamp into a short human-readable string.
 * e.g. "5 May · 14:32"
 */
function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

/**
 * Opens the gallery modal and loads all images from IndexedDB.
 * Called by the Gallery button in canvas.js.
 */
export async function openGallery() {
  if (!_modalEl) _modalEl = buildModal()

  const grid = _modalEl.querySelector('#gallery-modal-grid')
  const title = _modalEl.querySelector('#gallery-modal-title')

  // Show the modal immediately with a loading state
  grid.innerHTML = '<div class="gallery-empty">Loading…</div>'
  _modalEl.style.display = 'flex'

  const items = await loadAllFromGallery()

  title.textContent = `Gallery · ${items.length} image${items.length !== 1 ? 's' : ''}`
  grid.innerHTML = ''

  if (items.length === 0) {
    grid.innerHTML = '<div class="gallery-empty">No images generated yet.</div>'
    return
  }

  for (const item of items) {
    const card = document.createElement('div')
    card.className = 'gallery-card'

    // Thumbnail — clicking opens the full-size image in a new tab
    const img = document.createElement('img')
    img.src = item.src
    img.className = 'gallery-thumb'
    img.addEventListener('click', () => {
      const win = window.open()
      win.document.write(`<img src="${item.src}" style="max-width:100%;display:block;margin:auto;">`)
    })

    const meta = document.createElement('div')
    meta.className = 'gallery-meta'
    meta.textContent = item.label

    const date = document.createElement('div')
    date.className = 'gallery-date'
    date.textContent = formatDate(item.timestamp)

    card.appendChild(img)
    card.appendChild(meta)
    card.appendChild(date)
    grid.appendChild(card)
  }
}

/**
 * Hides the gallery modal.
 */
function closeGallery() {
  if (_modalEl) _modalEl.style.display = 'none'
}
