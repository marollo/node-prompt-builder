/**
 * Defines the Qwen Multi-Angle node — takes an image and re-draws it from a new camera
 * position using fal.ai's Qwen Image Edit 2511 Multiple Angles model.
 * Three on-canvas controls set the camera: Angle (around the subject), Elevation (up/down), Zoom.
 * Every other model setting lives in the Settings side panel.
 * Works like the Camera Move node, but runs on fal.ai instead of Replicate.
 */

import { LiteGraph } from 'litegraph.js'
import { log } from '../panel/LogPanel.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { showImage } from '../panel/ImageModal.js'
import { getFalaiApiKey } from '../api/apiClient.js'
import { addSpent } from '../api/CostControl.js'
import { buildRequest, parseResponse, calculateCost } from '../api/formats/qwenMultiAngle.js'
import { fetchAsBase64 } from '../utils/imageUtils.js'
import { saveToGallery } from '../utils/galleryStore.js'
import { loadThumbnails, thumbnailGridHeight, drawThumbnailGrid, thumbnailIndexAt } from '../utils/thumbnailUtils.js'

// Instruction always sent first so the person stays unchanged while only the camera moves
// (same wording as the Camera Move node). Any extra prompt typed in Settings is added after it.
const PRESERVE_SUBJECT_PROMPT = 'Preserve strictly the subject, pose, outfit and body details.'

// Height in pixels of each camera control row drawn on the canvas
const ROW_H = 30

// Width of the decrement / increment buttons on each side of a control row
const BTN_W = 28

// Space in pixels around the control rows and the thumbnail area
const MARGIN = 8

// The three camera controls — each maps to one model input parameter.
// `wrap` means going past the end loops round (360° is the same as 0°, i.e. the front again).
const CONTROLS = [
  { label: 'Angle',     key: '_hAngle', step: 45, min: 0,   max: 360, unit: '°', dec: '◀', inc: '▶', wrap: true },
  { label: 'Elevation', key: '_vAngle', step: 15, min: -30, max: 90,  unit: '°', dec: '▼', inc: '▲' },
  { label: 'Zoom',      key: '_zoom',   step: 1,  min: 0,   max: 10,  unit: '',  dec: '−', inc: '+' },
]

// ─── Node class ────────────────────────────────────────────────────────────────

function QwenMultiAngleNode() {
  this.size = [300, 60]

  // Receives a base64 image from an Image, Camera Move or another Qwen node
  this.addInput('image', 'image')

  // Outputs the first generated image as base64 so it can feed another node
  this.addOutput('image', 'image')

  // Camera values — defaults match the model's own defaults (front view, eye level, medium shot)
  this._hAngle = 0
  this._vAngle = 0
  this._zoom   = 5

  // Result state
  this._lastImages = []      // base64 strings of the generated images
  this._thumbEls   = []      // picture elements used to draw the thumbnails
  this._status     = 'idle'  // 'idle' | 'generating' | 'error'
  this._lastSeed   = null    // seed behind the current result — reused by a chained node

  // Optional model settings — edited in the Settings side panel.
  // null means "leave it out of the request so the model uses its own default".
  this._prompt            = ''
  this._negativePrompt    = ''
  this._loraScale         = 1
  this._guidanceScale     = 4.5
  this._numInferenceSteps = 28
  this._acceleration      = 'regular'
  this._imageSize         = 'auto'   // 'auto' = same size as the input image
  this._seed              = null     // null = random
  this._outputFormat      = 'png'
  this._numImages         = 1
  this._safetyChecker     = true

  // Buttons must be plain (non-async) functions — LiteGraph ignores async ones
  this.addWidget('button', 'Settings', null, () => openPanel(this))
  this.addWidget('button', 'Generate', null, () => { this._generate() })
  this.addWidget('button', 'Download', null, () => this._download())
}

QwenMultiAngleNode.title = 'Qwen Multi-Angle (fal.ai)'

// ─── Layout helpers ───────────────────────────────────────────────────────────

/**
 * Returns how tall the area under the control rows needs to be: thumbnails, or one status line.
 * Shared by computeSize and the drawing code so everything always fits inside the node.
 */
QwenMultiAngleNode.prototype._bottomAreaHeight = function () {
  if (this._status === 'generating' || this._status === 'error') return 24
  // _thumbEls may not exist yet — LiteGraph measures the node while it is still being built
  const h = thumbnailGridHeight(this._thumbEls || [], this.size[0] - MARGIN * 2)
  return h > 0 ? h + MARGIN : 0
}

/**
 * Returns the Y position where the first control row starts.
 * The rows sit directly above the bottom area, which fills the bottom of the node.
 */
QwenMultiAngleNode.prototype._controlsY = function () {
  return this.size[1] - this._bottomAreaHeight() - CONTROLS.length * ROW_H - MARGIN
}

/**
 * Tells LiteGraph how tall this node must be: buttons + the three control rows + the result area.
 */
QwenMultiAngleNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  if (size[0] < 300) size[0] = 300
  size[1] += CONTROLS.length * ROW_H + MARGIN * 2 + this._bottomAreaHeight()
  return size
}

/**
 * Called by LiteGraph while the user drags the node's corner.
 * Wider node = bigger thumbnails, so the height is recalculated to keep them inside.
 */
QwenMultiAngleNode.prototype.onResize = function (size) {
  size[1] = this.computeSize()[1]
}

// ─── onMouseDown ──────────────────────────────────────────────────────────────

/**
 * Handles clicks on the control rows (left button = step down, right = step up)
 * and on the thumbnails (opens the full-size viewer).
 * Returns true to consume the click so the node is not dragged.
 */
QwenMultiAngleNode.prototype.onMouseDown = function (e, pos) {
  const [x, y] = pos
  const startY = this._controlsY()

  for (let i = 0; i < CONTROLS.length; i++) {
    const ctrl = CONTROLS[i]
    const rowY = startY + i * ROW_H
    if (y < rowY || y >= rowY + ROW_H) continue

    // Which side was clicked: -1 = left (decrease), +1 = right (increase), 0 = middle (ignore)
    let dir = 0
    if (x >= MARGIN && x < MARGIN + BTN_W) dir = -1
    if (x >= this.size[0] - MARGIN - BTN_W && x <= this.size[0] - MARGIN) dir = 1
    if (dir === 0) return false

    let v = this[ctrl.key] + dir * ctrl.step
    // Angle loops round (e.g. 0° − 45° = 315°); the others stop at their limits
    if (ctrl.wrap) v = ((v % ctrl.max) + ctrl.max) % ctrl.max
    else v = Math.min(ctrl.max, Math.max(ctrl.min, v))
    this[ctrl.key] = v
    this.setDirtyCanvas(true)
    return true
  }

  // Click on a thumbnail → show all results in the full-size viewer
  const top = this.size[1] - this._bottomAreaHeight()
  const idx = thumbnailIndexAt(this._thumbEls, MARGIN, top, this.size[0] - MARGIN * 2, x, y)
  if (idx < 0) return false
  showImage(this._lastImages.map(url => ({ url, label: null })))
  return true
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the three control rows and, below them, the status line or result thumbnails.
 * Called by LiteGraph on every render frame.
 */
QwenMultiAngleNode.prototype.onDrawForeground = function (ctx) {
  if (this.flags.collapsed) return
  const w = this.size[0]
  const startY = this._controlsY()

  for (let i = 0; i < CONTROLS.length; i++) {
    const ctrl = CONTROLS[i]
    const rowY = startY + i * ROW_H
    const midY = rowY + ROW_H / 2 + 4

    // Row background, then the two step buttons at the ends
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.roundRect(MARGIN, rowY + 2, w - MARGIN * 2, ROW_H - 4, 3); ctx.fill()
    ctx.fillStyle = '#2c2c2c'
    ctx.beginPath(); ctx.roundRect(MARGIN + 2, rowY + 4, BTN_W - 4, ROW_H - 8, 3); ctx.fill()
    ctx.beginPath(); ctx.roundRect(w - MARGIN - BTN_W + 2, rowY + 4, BTN_W - 4, ROW_H - 8, 3); ctx.fill()

    ctx.font = '13px monospace'
    ctx.fillStyle = '#aaa'
    ctx.textAlign = 'center'
    ctx.fillText(ctrl.dec, MARGIN + BTN_W / 2, midY)
    ctx.fillText(ctrl.inc, w - MARGIN - BTN_W / 2, midY)

    // Label on the left, current value in the middle
    ctx.font = '10px monospace'
    ctx.fillStyle = '#555'
    ctx.textAlign = 'left'
    ctx.fillText(ctrl.label, MARGIN + BTN_W + 6, midY)
    ctx.fillStyle = '#ddd'
    ctx.textAlign = 'center'
    ctx.fillText(this[ctrl.key] + ctrl.unit, w / 2 + 20, midY)
  }

  // ── Result area ──
  const areaY = this.size[1] - this._bottomAreaHeight()
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  if (this._status === 'generating') {
    ctx.fillStyle = '#666'
    ctx.fillText('Generating…', w / 2, areaY + 14)
  } else if (this._status === 'error') {
    ctx.fillStyle = '#c0392b'
    ctx.fillText('Error — check the log bar.', w / 2, areaY + 14)
  } else {
    drawThumbnailGrid(ctx, this._thumbEls, MARGIN, areaY, w - MARGIN * 2)
  }
  ctx.textAlign = 'left'
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick. Sends the first generated image out of the output socket.
 */
QwenMultiAngleNode.prototype.onExecute = function () {
  this.setOutputData(0, this._lastImages[0] || null)
}

// ─── _pickSeed ────────────────────────────────────────────────────────────────

/**
 * Decides which seed ("starting noise") to send, so a chain of camera moves keeps a consistent look.
 * Order: the upstream node's last seed (Qwen or Camera Move) → the seed typed in Settings → a new random one.
 */
QwenMultiAngleNode.prototype._pickSeed = function () {
  const link   = this.inputs[0].link != null ? this.graph.links[this.inputs[0].link] : null
  const source = link ? this.graph.getNodeById(link.origin_id) : null
  if (source && source._lastSeed != null) return source._lastSeed
  if (this._seed !== null) return this._seed
  return Math.floor(Math.random() * 2147483647)
}

// ─── _buildInput ──────────────────────────────────────────────────────────────

/**
 * Collects the camera values and every Settings value into the object the model expects.
 * Field names match the fal.ai docs exactly.
 */
QwenMultiAngleNode.prototype._buildInput = function (imageData) {
  const input = {
    image_urls:            [imageData],
    horizontal_angle:      this._hAngle,
    vertical_angle:        this._vAngle,
    zoom:                  this._zoom,
    // Always start with the preserve instruction; the user's own text goes after it
    additional_prompt:     this._prompt ? PRESERVE_SUBJECT_PROMPT + ' ' + this._prompt : PRESERVE_SUBJECT_PROMPT,
    lora_scale:            this._loraScale,
    guidance_scale:        this._guidanceScale,
    num_inference_steps:   this._numInferenceSteps,
    acceleration:          this._acceleration,
    negative_prompt:       this._negativePrompt,
    seed:                  this._pickSeed(),
    output_format:         this._outputFormat,
    num_images:            this._numImages,
    enable_safety_checker: this._safetyChecker,
  }
  // 'auto' means "same size as the input image", which is what the model does when the field is missing
  if (this._imageSize !== 'auto') input.image_size = this._imageSize
  // A number box left blank in Settings is stored as null — leave it out so the model uses its default
  for (const k of Object.keys(input)) if (input[k] === null) delete input[k]
  return input
}

// ─── _setStatus ───────────────────────────────────────────────────────────────

/**
 * Changes the status line under the controls and resizes the node to fit it.
 */
QwenMultiAngleNode.prototype._setStatus = function (status) {
  this._status = status
  this.size = this.computeSize()
  this.setDirtyCanvas(true, true)
}

// ─── _generate ────────────────────────────────────────────────────────────────

/**
 * Sends the connected image and all settings to fal.ai, then shows and stores the results.
 * Called when the user clicks the Generate button.
 */
QwenMultiAngleNode.prototype._generate = async function () {
  const imageData = this.getInputData(0)
  if (!imageData) return log('Qwen Multi-Angle: connect an Image node to the input first.', 'error')
  const apiKey = getFalaiApiKey()
  if (!apiKey) return log('Qwen Multi-Angle: enter your fal.ai API key in Settings.', 'error')

  this._setStatus('generating')
  const input = this._buildInput(imageData)
  const { url, options } = buildRequest(input, apiKey)

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      // fal.ai puts its explanation in "detail" — sometimes text, sometimes a list of problems
      const detail = Array.isArray(err.detail)
        ? err.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
        : (err.detail || response.statusText)
      log('Qwen Multi-Angle error ' + response.status + ': ' + detail, 'error')
      return this._setStatus('error')
    }

    const { urls, seed } = parseResponse(await response.json())
    if (urls.length === 0) {
      log('Qwen Multi-Angle: the model returned no image.', 'error')
      return this._setStatus('error')
    }

    // fal.ai image links are temporary — store the pictures themselves as base64
    this._lastImages = await Promise.all(urls.map(u => fetchAsBase64(u)))
    for (const src of this._lastImages) saveToGallery(src, 'Qwen Multi-Angle')
    // Prefer the seed fal.ai reports; fall back to the one we sent
    this._lastSeed = seed ?? input.seed

    loadThumbnails(this._lastImages, (els) => {
      this._thumbEls = els
      // Price depends on the output size, which we only know once the pictures have loaded
      const cost = calculateCost(els.map(img => ({ width: img.naturalWidth, height: img.naturalHeight })))
      addSpent(cost)
      log(`Qwen Multi-Angle: ${els.length} image(s) generated — ~$${cost.toFixed(3)} (seed ${this._lastSeed}).`, 'success')
      this._setStatus('idle')
    })
  } catch (err) {
    log('Qwen Multi-Angle: request failed — ' + err.message, 'error')
    this._setStatus('error')
  }
}

// ─── _download ────────────────────────────────────────────────────────────────

/**
 * Saves every generated image to the user's computer.
 * The camera values are put in the file name so the angle is easy to recognise later.
 */
QwenMultiAngleNode.prototype._download = function () {
  if (this._lastImages.length === 0) return log('Qwen Multi-Angle: generate an image first before downloading.', 'error')
  this._lastImages.forEach((src, i) => {
    // The file extension comes from the image data itself (e.g. "data:image/png;base64,…")
    const ext = (src.match(/^data:image\/(\w+)/) || [, 'png'])[1]
    const a = document.createElement('a')
    a.href = src
    a.download = `qwen-angle${this._hAngle}_elev${this._vAngle}_zoom${this._zoom}_${i + 1}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  })
}

// ─── Serialization ────────────────────────────────────────────────────────────

// Names of every setting saved with the graph — listed once so saving and loading can't drift apart
const SAVED_FIELDS = [
  '_hAngle', '_vAngle', '_zoom', '_lastImages', '_lastSeed',
  '_prompt', '_negativePrompt', '_loraScale', '_guidanceScale', '_numInferenceSteps',
  '_acceleration', '_imageSize', '_seed', '_outputFormat', '_numImages', '_safetyChecker',
]

/**
 * Called by LiteGraph when saving the graph. Stores the camera values, settings and last results.
 */
QwenMultiAngleNode.prototype.onSerialize = function (info) {
  info.extra = {}
  for (const f of SAVED_FIELDS) info.extra[f] = this[f]
}

/**
 * Called by LiteGraph when loading a saved graph. Restores everything and redraws the thumbnails.
 * Fields missing from an older save keep the defaults set in the constructor.
 */
QwenMultiAngleNode.prototype.onConfigure = function (info) {
  if (!info.extra) return
  for (const f of SAVED_FIELDS) {
    if (info.extra[f] !== undefined) this[f] = info.extra[f]
  }
  loadThumbnails(this._lastImages, (els) => {
    this._thumbEls = els
    this._setStatus('idle')
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/QwenMultiAngle', QwenMultiAngleNode)

export { QwenMultiAngleNode }
