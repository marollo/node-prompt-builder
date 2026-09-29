// Helper functions for drawing generated images as thumbnails at the bottom of a node.
// Shared by every model node that shows its results on the canvas.

// Space in pixels between thumbnails in the grid
const GAP = 6

/**
 * Turns a list of base64 images into loaded picture elements, then calls onReady with them.
 * Pictures load in the background, so the node can only measure and draw them once they finish.
 */
function loadThumbnails(base64List, onReady) {
  const els = []
  let pending = base64List.length
  if (pending === 0) return onReady(els)
  for (const src of base64List) {
    const img = new Image()
    // Count every picture as "finished" whether it loaded or failed, so we never wait forever
    img.onload = img.onerror = () => { if (--pending === 0) onReady(els) }
    img.src = src
    els.push(img)
  }
}

/**
 * Works out the rectangle (position and size) of every thumbnail.
 * One picture fills the full width at its own shape; two or more share a 2-column grid of squares.
 */
function cellRects(images, x, y, width) {
  // Ignore pictures that failed to load — they have no size to draw
  const ready = images.filter(img => img.complete && img.naturalWidth > 0)
  if (ready.length === 1) {
    const img = ready[0]
    return [{ img, x, y, w: width, h: width * img.naturalHeight / img.naturalWidth }]
  }
  const cell = (width - GAP) / 2
  return ready.map((img, i) => ({
    img,
    x: x + (i % 2) * (cell + GAP),
    y: y + Math.floor(i / 2) * (cell + GAP),
    w: cell,
    h: cell,
  }))
}

/**
 * Returns how many pixels tall the thumbnail area is, or 0 when there is nothing to show.
 * Nodes add this to their height so the pictures always fit inside the node.
 */
function thumbnailGridHeight(images, width) {
  const rects = cellRects(images, 0, 0, width)
  return rects.reduce((max, r) => Math.max(max, r.y + r.h), 0)
}

/**
 * Draws every thumbnail with rounded corners, starting at the given top-left corner.
 * In the grid each square is filled by the centre of the picture (like a cropped photo print).
 */
function drawThumbnailGrid(ctx, images, x, y, width) {
  for (const r of cellRects(images, x, y, width)) {
    const iw = r.img.naturalWidth
    const ih = r.img.naturalHeight
    // Pick the largest centred piece of the picture that has the same shape as the cell
    const scale = Math.min(iw / r.w, ih / r.h)
    const sw = r.w * scale
    const sh = r.h * scale
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(r.x, r.y, r.w, r.h, 4)
    ctx.clip()
    ctx.drawImage(r.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, r.x, r.y, r.w, r.h)
    ctx.restore()
  }
}

/**
 * Returns the position in the list of the thumbnail under a click, or -1 if the click missed.
 * Lets a node open the right picture in the full-size viewer.
 */
function thumbnailIndexAt(images, x, y, width, clickX, clickY) {
  const rects = cellRects(images, x, y, width)
  const hit = rects.find(r => clickX >= r.x && clickX <= r.x + r.w && clickY >= r.y && clickY <= r.y + r.h)
  return hit ? images.indexOf(hit.img) : -1
}

export { loadThumbnails, thumbnailGridHeight, drawThumbnailGrid, thumbnailIndexAt }
