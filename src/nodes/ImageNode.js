/**
 * Defines the Image node — lets the user upload an image and pass it downstream.
 * Displays a thumbnail of the uploaded image directly on the node canvas.
 * Lives in the "media" category so it appears under a separate section in the node menu.
 */

import { LiteGraph } from 'litegraph.js'

// Reusable hidden file input — created once, shared across all Image node instances.
// A single shared input avoids creating a new DOM element every time a node triggers upload.
let _fileInput = null

/**
 * Returns the shared hidden file input, creating it on first call.
 * Appended to document.body so it exists in the DOM but is never visible.
 */
function getFileInput() {
  if (!_fileInput) {
    _fileInput = document.createElement('input')
    _fileInput.type = 'file'
    _fileInput.accept = 'image/jpeg,image/png,image/webp'
    _fileInput.style.display = 'none'
    document.body.appendChild(_fileInput)
  }
  return _fileInput
}

// ─── Node class ────────────────────────────────────────────────────────────────

function ImageNode() {
  // Default size — grows taller automatically once an image is loaded
  this.size = [220, 60]

  // One output slot — passes the base64 image string to connected nodes
  this.addOutput('image', 'image')

  // The base64 image string — null until the user uploads a file
  this.imageData = null

  // The HTMLImageElement used for canvas drawing — rebuilt from imageData after upload or load
  this._imageEl = null

  // The natural width/height ratio of the uploaded image — set once the image has decoded.
  // Used by computeSize and onDrawForeground to keep the thumbnail proportional.
  this._aspectRatio = null

  // Upload button — clicking it opens the system file picker
  this.addWidget('button', 'Upload Image', null, () => this._triggerUpload())
}

ImageNode.title = 'Image'

// ─── _triggerUpload ────────────────────────────────────────────────────────────

/**
 * Opens the system file picker and stores the chosen image as base64 on this node.
 * Rebuilds the HTMLImageElement and resizes the node to make room for the thumbnail.
 */
ImageNode.prototype._triggerUpload = function () {
  const input = getFileInput()

  // Define the handler and remove it after one use — prevents duplicate callbacks
  // when the user clicks Upload on multiple nodes in the same session
  const handler = () => {
    input.removeEventListener('change', handler)
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      this.imageData = e.target.result
      this._buildImageEl()
      // Resize the node immediately to show the thumbnail area
      this.size = this.computeSize()
      this.setDirtyCanvas(true, true)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be selected again next time
    input.value = ''
  }

  input.addEventListener('change', handler)
  input.click()
}

// ─── _buildImageEl ────────────────────────────────────────────────────────────

/**
 * Creates an HTMLImageElement from the stored base64 string.
 * Called after a file is uploaded and when the graph is restored from IndexedDB.
 * ctx.drawImage() needs an HTMLImageElement — it cannot draw from a raw base64 string.
 */
ImageNode.prototype._buildImageEl = function () {
  const img = new Image()

  // Once the browser has decoded the image we can read its real pixel dimensions.
  // We store the ratio and immediately resize the node so the thumbnail area
  // is the correct height before the first draw.
  img.onload = () => {
    this._aspectRatio = img.naturalWidth / img.naturalHeight
    this.size = this.computeSize()
    this.setDirtyCanvas(true, true)
  }

  img.src = this.imageData
  this._imageEl = img
}

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node should be.
 * Adds 140px when an image is loaded to make room for the thumbnail.
 * Without this LiteGraph would shrink the node to fit only the button widget.
 */
ImageNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  if (this.imageData && this._aspectRatio) {
    // Calculate thumbnail height from the image's real aspect ratio so the node
    // is exactly as tall as it needs to be — no wasted space, no cropping.
    const margin = 8
    const imgW = this.size[0] - margin * 2
    const imgH = imgW / this._aspectRatio
    size[1] += imgH + margin * 2
  }
  return size
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Outputs the base64 image string so connected nodes can receive it.
 */
ImageNode.prototype.onExecute = function () {
  this.setOutputData(0, this.imageData)
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the image thumbnail directly onto the node canvas.
 * Called by LiteGraph on every render frame.
 * Skips drawing when the node is collapsed or no image has been uploaded yet.
 */
ImageNode.prototype.onDrawForeground = function (ctx) {
  if (this.flags.collapsed) return
  if (!this._imageEl || !this._imageEl.complete) return
  if (!this._aspectRatio) return

  const w      = this.size[0]
  const h      = this.size[1]
  const margin = 8

  // Fill the node width minus margins, then derive the height from the real ratio
  const imgX = margin
  const imgW = w - margin * 2
  const imgH = imgW / this._aspectRatio

  // Anchor the thumbnail to the bottom of the node with a small margin below it
  const imgY = h - imgH - margin

  // Clip to a rounded rectangle so the thumbnail has soft corners
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(imgX, imgY, imgW, imgH, 4)
  ctx.clip()
  ctx.drawImage(this._imageEl, imgX, imgY, imgW, imgH)
  ctx.restore()
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph to IndexedDB.
 * Persists the base64 image string so it survives a page reload.
 */
ImageNode.prototype.onSerialize = function (info) {
  info.extra = { imageData: this.imageData }
}

/**
 * Called by LiteGraph when loading a saved graph from IndexedDB.
 * Restores the image data and rebuilds the HTMLImageElement for drawing.
 */
ImageNode.prototype.onConfigure = function (info) {
  if (!info.extra || !info.extra.imageData) return
  this.imageData = info.extra.imageData
  this._buildImageEl()
  // Size is not set here — LiteGraph calls computeSize automatically after onConfigure
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('media/Image', ImageNode)

export { ImageNode }
