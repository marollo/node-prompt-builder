/**
 * Defines the Camera Move node — takes an image and applies virtual camera
 * movement using the qwen-edit-multiangle model on Replicate.
 * Three controls let the user orbit, zoom, and tilt the camera.
 * Each click on a control button changes the value by one step.
 * Clicking Generate sends the image and all three values to the model.
 * The result image is drawn as a thumbnail on the node and passed downstream.
 */

import { LiteGraph } from 'litegraph.js'
import { log } from '../panel/LogPanel.js'
import { buildRequest, parseResponse, fetchImageAsBase64 } from '../api/formats/replicate.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { saveToGallery } from '../utils/galleryStore.js'

// Replicate model path — the owner/name slug from the model's URL
const MODEL_PATH = 'qwen/qwen-edit-multiangle'

// Height in pixels of each camera control row drawn on the canvas
const ROW_H = 30

// Width of the decrement / increment buttons on each side of a control row
const BTN_W = 28

// The three camera controls — each maps to one model input parameter
const CONTROLS = [
  { label: 'Orbit', key: '_rotateDeg', param: 'rotate_degrees', step: 15,  min: -90,  max: 90,  unit: '°', dec: '◀', inc: '▶' },
  { label: 'Zoom',  key: '_moveForwd', param: 'move_forward',   step: 1,   min: 0,    max: 10,  unit: '',  dec: '−', inc: '+' },
  { label: 'Tilt',  key: '_vertTilt',  param: 'vertical_tilt',  step: 1,   min: -1,   max: 1,   unit: '',  dec: '▼', inc: '▲' },
]

// ─── Node class ────────────────────────────────────────────────────────────────

function CameraMoveNode() {
  this.size = [280, 60]

  // Receives a base64 image from a connected Image or CameraMove node
  this.addInput('image', 'image')

  // Outputs the generated image as base64 for downstream nodes
  this.addOutput('image', 'image')

  // Current camera values — each button click adjusts these by one step
  this._rotateDeg = 0    // orbit: positive = left, negative = right
  this._moveForwd = 0    // zoom: positive = closer, negative = further
  this._vertTilt  = 0    // tilt: positive = low angle looking up, negative = top-down

  // Result state
  this._outputImageData = null  // base64 string of the generated image
  this._resultEl        = null  // HTMLImageElement used to draw the thumbnail
  this._aspectRatio     = null  // naturalWidth / naturalHeight of the result
  this._status          = 'idle' // 'idle' | 'generating' | 'done' | 'error'

  // All optional generation settings — adjustable from the Settings side panel
  this._prompt                 = ''
  this._useWideAngle           = false
  this._aspectRatio            = 'match_input_image'
  this._goFast                 = true
  this._numInferenceSteps      = null   // null = use go_fast preset
  this._seed                   = null   // null = random
  this._useMultipleAngles      = true
  this._multipleAnglesStrength = 1
  this._trueGuidanceScale      = null
  this._loraWeights            = ''
  this._loraScale              = null
  this._outputFormat           = 'webp'
  this._outputQuality          = 95
  this._disableSafetyChecker   = false

  // Replicate API key — typed directly on the node
  this.addWidget('text', 'API Key', '', () => {})

  // Settings button — opens the side panel with all optional parameters
  this.addWidget('button', 'Settings', null, () => openPanel(this))

  // Generate button — sends the input image and current camera values to Replicate
  this.addWidget('button', 'Generate', null, () => this._generate())

  // Download button — saves the generated image to the user's computer
  this.addWidget('button', 'Download', null, () => this._download())
}

CameraMoveNode.title = 'Camera Move'

// ─── _controlsY ───────────────────────────────────────────────────────────────

/**
 * Returns the Y coordinate where the three control rows start on the canvas.
 * Controls are anchored above the result thumbnail (if any) at the node bottom.
 */
CameraMoveNode.prototype._controlsY = function () {
  const margin = 8
  let thumbH = 0
  if (this._resultEl && this._resultEl.complete && this._aspectRatio) {
    const imgW = this.size[0] - margin * 2
    thumbH = imgW / this._aspectRatio + margin * 2
  }
  return this.size[1] - CONTROLS.length * ROW_H - margin * 2 - thumbH
}

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node must be.
 * Always reserves space for the three control rows below the widgets.
 * Adds more height when a result thumbnail is present.
 */
CameraMoveNode.prototype.computeSize = function () {
  const size   = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  const margin = 8
  size[1] += CONTROLS.length * ROW_H + margin * 2
  if (this._outputImageData && this._aspectRatio) {
    const imgW  = this.size[0] - margin * 2
    size[1] += imgW / this._aspectRatio + margin * 2
  }
  return size
}

// ─── onMouseDown ──────────────────────────────────────────────────────────────

/**
 * Handles clicks on the three camera control rows.
 * Left button decrements the value by one step, right button increments it.
 * Returns true to consume the event and prevent the node from being dragged.
 */
CameraMoveNode.prototype.onMouseDown = function (e, pos) {
  const margin = 8
  const x = pos[0]
  const y = pos[1]
  const startY = this._controlsY()

  for (let i = 0; i < CONTROLS.length; i++) {
    const ctrl = CONTROLS[i]
    const rowY = startY + margin + i * ROW_H

    if (y < rowY || y >= rowY + ROW_H) continue

    // Decrement — left button
    if (x >= margin && x < margin + BTN_W) {
      this[ctrl.key] = parseFloat(Math.max(ctrl.min, this[ctrl.key] - ctrl.step).toFixed(2))
      this.setDirtyCanvas(true)
      return true
    }

    // Increment — right button
    if (x >= this.size[0] - margin - BTN_W && x <= this.size[0] - margin) {
      this[ctrl.key] = parseFloat(Math.min(ctrl.max, this[ctrl.key] + ctrl.step).toFixed(2))
      this.setDirtyCanvas(true)
      return true
    }
  }
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the three camera control rows and the result thumbnail on every frame.
 * Each row shows a decrement button, the current value, and an increment button.
 */
CameraMoveNode.prototype.onDrawForeground = function (ctx) {
  if (this.flags.collapsed) return

  const w      = this.size[0]
  const margin = 8
  const startY = this._controlsY()

  // ── Control rows ──────────────────────────────────────────────────────────

  for (let i = 0; i < CONTROLS.length; i++) {
    const ctrl = CONTROLS[i]
    const rowY = startY + margin + i * ROW_H
    const midY = rowY + ROW_H / 2 + 4

    // Row background
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.roundRect(margin, rowY + 2, w - margin * 2, ROW_H - 4, 3)
    ctx.fill()

    // Decrement button
    ctx.fillStyle = '#2c2c2c'
    ctx.beginPath()
    ctx.roundRect(margin + 2, rowY + 4, BTN_W - 4, ROW_H - 8, 3)
    ctx.fill()
    ctx.fillStyle = '#aaa'
    ctx.font      = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(ctrl.dec, margin + BTN_W / 2, midY)

    // Increment button
    ctx.fillStyle = '#2c2c2c'
    ctx.beginPath()
    ctx.roundRect(w - margin - BTN_W + 2, rowY + 4, BTN_W - 4, ROW_H - 8, 3)
    ctx.fill()
    ctx.fillStyle = '#aaa'
    ctx.fillText(ctrl.inc, w - margin - BTN_W / 2, midY)

    // Label (left area, after the decrement button)
    ctx.fillStyle = '#555'
    ctx.font      = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(ctrl.label, margin + BTN_W + 6, midY)

    // Current value (center)
    const decimals = ctrl.step < 1 ? 1 : 0
    const valStr   = this[ctrl.key].toFixed(decimals) + ctrl.unit
    ctx.fillStyle  = '#ddd'
    ctx.textAlign  = 'center'
    ctx.fillText(valStr, w / 2 + 20, midY)
  }

  // ── Result area ───────────────────────────────────────────────────────────

  const thumbY = startY + CONTROLS.length * ROW_H + margin * 2

  if (this._status === 'generating') {
    ctx.fillStyle = '#666'
    ctx.font      = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Generating…', w / 2, thumbY + 14)
  } else if (this._status === 'error') {
    ctx.fillStyle = '#c0392b'
    ctx.font      = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Error — check the log bar.', w / 2, thumbY + 14)
  } else if (this._resultEl && this._resultEl.complete && this._aspectRatio) {
    const imgW = w - margin * 2
    const imgH = imgW / this._aspectRatio
    const imgX = margin
    const imgY = this.size[1] - imgH - margin

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(imgX, imgY, imgW, imgH, 4)
    ctx.clip()
    ctx.drawImage(this._resultEl, imgX, imgY, imgW, imgH)
    ctx.restore()
  }

  ctx.textAlign = 'left'
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Outputs the generated image as base64 so downstream nodes can receive it.
 */
CameraMoveNode.prototype.onExecute = function () {
  this.setOutputData(0, this._outputImageData)
}

// ─── _generate ────────────────────────────────────────────────────────────────

/**
 * Reads the connected image and the current camera values, sends them to
 * Replicate's qwen-edit-multiangle model, and stores the result.
 * Called when the user clicks the Generate button.
 */
CameraMoveNode.prototype._generate = async function () {
  const imageData = this.getInputData(0)
  if (!imageData) {
    log('Camera Move: connect an Image node to the input first.', 'error')
    return
  }

  const apiKey = this.widgets[0].value
  if (!apiKey) {
    log('Camera Move: enter your Replicate API key.', 'error')
    return
  }

  // Show the generating state immediately
  this._status          = 'generating'
  this._outputImageData = null
  this._resultEl        = null
  this._aspectRatio     = null
  this.size             = this.computeSize()
  this.setDirtyCanvas(true, true)

  // Build the input object from camera values and all optional settings
  const inputParams = {
    image:                    imageData,
    rotate_degrees:           Math.round(this._rotateDeg),
    move_forward:             Math.round(this._moveForwd),
    vertical_tilt:            Math.round(this._vertTilt),
    use_wide_angle:           this._useWideAngle,
    aspect_ratio:             this._aspectRatio,
    go_fast:                  this._goFast,
    use_multiple_angles:      this._useMultipleAngles,
    multiple_angles_strength: this._multipleAnglesStrength,
    output_format:            this._outputFormat,
    output_quality:           this._outputQuality,
    disable_safety_checker:   this._disableSafetyChecker,
  }

  // Include optional fields only when the user has set them
  if (this._prompt)                     inputParams.prompt               = this._prompt
  if (this._numInferenceSteps !== null) inputParams.num_inference_steps  = this._numInferenceSteps
  if (this._seed !== null)              inputParams.seed                  = this._seed
  if (this._trueGuidanceScale !== null) inputParams.true_guidance_scale   = this._trueGuidanceScale
  if (this._loraWeights)                inputParams.lora_weights           = this._loraWeights
  if (this._loraScale !== null)         inputParams.lora_scale             = this._loraScale

  const { url, options } = buildRequest(MODEL_PATH, inputParams, apiKey)

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      log('Camera Move error: ' + (err?.detail || response.statusText), 'error')
      this._status = 'error'
      this.setDirtyCanvas(true, true)
      return
    }

    const data   = await response.json()
    const imgUrl = parseResponse(data)

    if (!imgUrl) {
      log('Camera Move: model returned no image. Status: ' + data.status, 'error')
      this._status = 'error'
      this.setDirtyCanvas(true, true)
      return
    }

    // Replicate returns an https:// URL — convert to base64 for local storage
    const base64 = await fetchImageAsBase64(imgUrl)
    this._outputImageData = base64
    saveToGallery(base64, 'Camera Move')

    // Build the thumbnail element — aspect ratio is set in onload
    const img  = new Image()
    img.onload = () => {
      this._aspectRatio = img.naturalWidth / img.naturalHeight
      this._status      = 'done'
      this.size         = this.computeSize()
      this.setDirtyCanvas(true, true)
    }
    img.src        = base64
    this._resultEl = img

    log('Camera Move: image generated successfully.', 'success')

  } catch (err) {
    log('Camera Move: request failed — ' + err.message, 'error')
    this._status = 'error'
    this.setDirtyCanvas(true, true)
  }
}

// ─── _download ────────────────────────────────────────────────────────────────

/**
 * Triggers a file download of the generated image to the user's computer.
 * Creates a temporary invisible <a> element, sets its href to the base64
 * image data, and clicks it — the browser then saves it as a PNG file.
 */
CameraMoveNode.prototype._download = function () {
  if (!this._outputImageData) {
    log('Camera Move: generate an image first before downloading.', 'error')
    return
  }

  // Build a filename that includes the current camera values for reference
  const name = `camera-move_orbit${this._rotateDeg}_zoom${this._moveForwd}_tilt${this._vertTilt}.png`

  // Create a temporary link, click it to trigger the browser Save dialog, then remove it
  const a    = document.createElement('a')
  a.href     = this._outputImageData
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Persists the camera values, result image, and status.
 */
CameraMoveNode.prototype.onSerialize = function (info) {
  info.extra = {
    rotateDeg:              this._rotateDeg,
    moveForwd:              this._moveForwd,
    vertTilt:               this._vertTilt,
    outputImageData:        this._outputImageData,
    status:                 this._status,
    prompt:                 this._prompt,
    useWideAngle:           this._useWideAngle,
    aspectRatio:            this._aspectRatio,
    goFast:                 this._goFast,
    numInferenceSteps:      this._numInferenceSteps,
    seed:                   this._seed,
    useMultipleAngles:      this._useMultipleAngles,
    multipleAnglesStrength: this._multipleAnglesStrength,
    trueGuidanceScale:      this._trueGuidanceScale,
    loraWeights:            this._loraWeights,
    loraScale:              this._loraScale,
    outputFormat:           this._outputFormat,
    outputQuality:          this._outputQuality,
    disableSafetyChecker:   this._disableSafetyChecker,
  }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores camera values and rebuilds the result thumbnail if one was saved.
 */
CameraMoveNode.prototype.onConfigure = function (info) {
  if (!info.extra) return
  // Math.round guards against old saves that stored float values before the integer fix
  this._rotateDeg = Math.round(info.extra.rotateDeg ?? 0)
  this._moveForwd = Math.round(info.extra.moveForwd ?? 0)
  this._vertTilt  = Math.round(info.extra.vertTilt  ?? 0)
  this._status    = info.extra.status ?? 'idle'

  // Restore all optional settings, falling back to defaults for old saved nodes
  this._prompt                 = info.extra.prompt                 ?? ''
  this._useWideAngle           = info.extra.useWideAngle           ?? false
  this._aspectRatio            = info.extra.aspectRatio            ?? 'match_input_image'
  this._goFast                 = info.extra.goFast                 ?? true
  this._numInferenceSteps      = info.extra.numInferenceSteps      ?? null
  this._seed                   = info.extra.seed                   ?? null
  this._useMultipleAngles      = info.extra.useMultipleAngles      ?? true
  this._multipleAnglesStrength = info.extra.multipleAnglesStrength ?? 1
  this._trueGuidanceScale      = info.extra.trueGuidanceScale      ?? null
  this._loraWeights            = info.extra.loraWeights            ?? ''
  this._loraScale              = info.extra.loraScale              ?? null
  this._outputFormat           = info.extra.outputFormat           ?? 'webp'
  this._outputQuality          = info.extra.outputQuality          ?? 95
  this._disableSafetyChecker   = info.extra.disableSafetyChecker   ?? false

  if (info.extra.outputImageData) {
    this._outputImageData = info.extra.outputImageData
    const img  = new Image()
    img.onload = () => {
      this._aspectRatio = img.naturalWidth / img.naturalHeight
      this.size         = this.computeSize()
      this.setDirtyCanvas(true, true)
    }
    img.src        = info.extra.outputImageData
    this._resultEl = img
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/CameraMove', CameraMoveNode)

export { CameraMoveNode }
