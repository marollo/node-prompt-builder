/**
 * Defines the Model Polas node — takes one picture of a model and makes the five plain,
 * natural pictures casting agencies ask for ("polas"): full body in simple black swimwear,
 * front face, side face, full back and full side.
 * One click on Generate sends five Nano Banana 2 edit requests to fal.ai at the same time,
 * each with the model's picture and one preset pose instruction.
 */

import { LiteGraph } from 'litegraph.js'
import { log } from '../panel/LogPanel.js'
import { showImage } from '../panel/ImageModal.js'
import { getFalaiApiKey } from '../api/apiClient.js'
import { addSpent } from '../api/CostControl.js'
import { buildRequest, parseResponse, calculateCost } from '../api/formats/falai.js'
import { FALAI_ASPECT_RATIO, FALAI_RESOLUTION } from '../utils/nodeOptions.js'
import { fetchAsBase64 } from '../utils/imageUtils.js'
import { saveToGallery } from '../utils/galleryStore.js'
import { loadThumbnails, thumbnailGridHeight, drawThumbnailGrid, thumbnailIndexAt } from '../utils/thumbnailUtils.js'

// Space in pixels around the cost line and the thumbnail area
const MARGIN = 8

// Height in pixels of the "Est: ~$0.40" line drawn under the buttons
const EST_H = 22

// The outfit for all five pictures, so the whole set matches — face close-ups included.
// Swimwear, not underwear: "wearing only a tight black bra and briefs" was refused by fal.ai's content checker.
// The user picks the gender on the node, so the right swimwear is named instead of leaving it to the model.
// "Not the clothes from the reference image" is needed: without it the face close-ups kept the original clothes
const CHOOSE = 'Choose…'
const OUTFITS = {
  Female: 'a simple plain black fitted two-piece swimsuit',
  Male:   'simple plain black fitted swim trunks',
}
const GENDERS = [CHOOSE, ...Object.keys(OUTFITS)]

// Added to every pose so the person stays the same and the pictures look like plain, honest photos.
// The words "polaroid" / "polas" are left out on purpose: they made the model copy the look of an
// instant photo (white frame, faded colours) instead of making a clean photograph.
// The background is an "infinity cove" (a studio wall that curves into the floor), described in plain
// words too, so no corner between floor and wall shows and the background looks endless
const POLA_STYLE = 'Same person as in the reference image: same identity, face, body shape, skin and hair colour. ' +
  'Seamless light-grey infinity cove background: the floor curves smoothly into the wall with no visible corner, ' +
  'edge or horizon line, evenly lit so the background looks endless. Soft natural daylight. Clean, sharp, realistic digital photograph, ' +
  'true-to-life colours, unretouched, no filters, no frame or border.'

// Fixed camera set-ups, so every run frames the pictures the same way (backlog #18).
// Without them the model chose its own crop, distance and camera height each time.
// One set-up is shared by the three full-body pictures, the other by the two face close-ups
const FULL_BODY_FRAMING = 'Camera: 50mm lens at waist height, pointing straight at the person, no tilt. ' +
  'The person is centred, standing on the floor, the whole body from the top of the head to the feet in frame, ' +
  'a small even gap above the head and the feet just above the bottom edge.'
const PORTRAIT_FRAMING = 'Camera: 85mm lens at eye level, pointing straight at the head, no tilt. ' +
  'Tight crop from just above the top of the head down to the collarbones, head centred and filling most of the frame.'

// Said in both face close-ups, so the face looks the same in each
const FACE_NATURAL = 'Neutral relaxed expression, mouth closed, no makeup, hair natural and unstyled.'

// The five pictures to make — label (shown in the viewer and file names) + the pose instruction.
// Each pose names an exact angle; both side views face LEFT so the two profiles always match.
// The outfit is not repeated here: _generatePose adds the chosen gender's swimwear to every pose
const POSES = [
  { label: 'Full body', prompt: `Full-body front view: the person faces the camera squarely, standing straight, feet hip-width apart, arms relaxed at the sides. ${FULL_BODY_FRAMING}` },
  { label: 'Face front', prompt: `Frontal head-and-shoulders close-up: the person faces the camera squarely and looks straight into the lens. ${FACE_NATURAL} ${PORTRAIT_FRAMING}` },
  { label: 'Face side', prompt: `Side profile head-and-shoulders close-up: the head is turned exactly 90 degrees, facing the left edge of the picture, only one eye visible. ${FACE_NATURAL} ${PORTRAIT_FRAMING}` },
  { label: 'Back', prompt: `Full-body back view: the person is seen entirely from behind, standing straight, feet hip-width apart, arms relaxed at the sides. ${FULL_BODY_FRAMING}` },
  { label: 'Side', prompt: `Full-body side profile view: the whole body is turned exactly 90 degrees, facing the left edge of the picture, standing straight, arms relaxed at the sides. ${FULL_BODY_FRAMING}` },
]

// ─── Node class ────────────────────────────────────────────────────────────────

function ModelPolasNode() {
  this.size = [300, 140]

  // Receives the model's picture (from an Image node or any node with an image output)
  this.addInput('image', 'image')

  // Sends the first finished pola on to another node (same behaviour as NB2's image output)
  this.addOutput('image', 'image')

  // Settings shared by all five requests; saved with the graph (serialize_widgets below)
  this._resolution  = this.addWidget('combo', 'Resolution',   '1K',   null, { values: FALAI_RESOLUTION })
  // Starts on 3:4 portrait, not "auto": "auto" copies the reference picture's shape, so a wide
  // reference gave wide polas and the crop changed from run to run (backlog #18)
  this._aspectRatio = this.addWidget('combo', 'Aspect Ratio', '3:4', null, { values: FALAI_ASPECT_RATIO })
  // Starts on "Choose…" so the user must say whether the person is female or male (decides the swimwear)
  this._gender      = this.addWidget('combo', 'Gender',       CHOOSE, null, { values: GENDERS })
  this.serialize_widgets = true

  // Result state — the pictures as base64 and, in the same order, which pose each one is
  this._lastImages = []
  this._lastLabels = []
  this._thumbEls   = []       // picture elements used to draw the thumbnails
  this._status     = 'idle'   // 'idle' | 'generating' | 'error'

  // Buttons must be plain (non-async) functions — LiteGraph ignores async ones
  this.addWidget('button', 'Generate', null, () => { this._generate() })
  this.addWidget('button', 'Download', null, () => this._download())
}

ModelPolasNode.title = 'Model Polas (fal.ai)'

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Returns how tall the area under the cost line needs to be: the thumbnails, or one status line.
 * Shared by computeSize and the drawing code so the pictures always fit inside the node.
 */
ModelPolasNode.prototype._bottomAreaHeight = function () {
  if (this._status === 'generating' || this._status === 'error') return 24
  // _thumbEls may not exist yet — LiteGraph measures the node while it is still being built
  const h = thumbnailGridHeight(this._thumbEls || [], this.size[0] - MARGIN * 2)
  return h > 0 ? h + MARGIN : 0
}

/**
 * Tells LiteGraph how tall this node must be: widgets + the cost line + the result area.
 */
ModelPolasNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  if (size[0] < 300) size[0] = 300
  size[1] += EST_H + this._bottomAreaHeight()
  return size
}

/**
 * Called by LiteGraph while the user drags the node's corner.
 * Wider node = bigger thumbnails, so the height is recalculated to keep them inside.
 */
ModelPolasNode.prototype.onResize = function (size) {
  size[1] = this.computeSize()[1]
}

/**
 * Changes the status line and resizes the node to fit it.
 */
ModelPolasNode.prototype._setStatus = function (status) {
  this._status = status
  this.size = this.computeSize()
  this.setDirtyCanvas(true, true)
}

// ─── Cost ─────────────────────────────────────────────────────────────────────

/**
 * Returns the price of one full set of five polas at the chosen resolution.
 * Uses the same NB2 price table as the NB2 Model node.
 */
ModelPolasNode.prototype._estimate = function () {
  return calculateCost({ resolution: this._resolution.value, numImages: 1 }) * POSES.length
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

/**
 * Draws the estimated cost and, below it, "Generating…", an error line or the result thumbnails.
 * Called by LiteGraph on every render frame.
 */
ModelPolasNode.prototype.onDrawForeground = function (ctx) {
  if (this.flags.collapsed) return
  const w = this.size[0]
  const areaY = this.size[1] - this._bottomAreaHeight()

  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#aaa'
  ctx.fillText(`Est: ~$${this._estimate().toFixed(2)} for ${POSES.length} pictures`, w / 2, areaY - 8)

  if (this._status === 'generating') {
    ctx.fillStyle = '#666'
    // Says which round is running, so the user knows why it takes about twice as long
    ctx.fillText(this._statusText || 'Generating…', w / 2, areaY + 14)
  } else if (this._status === 'error') {
    ctx.fillStyle = '#c0392b'
    ctx.fillText('Error — check the log bar.', w / 2, areaY + 14)
  } else {
    drawThumbnailGrid(ctx, this._thumbEls, MARGIN, areaY, w - MARGIN * 2)
  }
  ctx.textAlign = 'left'
}

/**
 * Opens the full-size viewer when a thumbnail is clicked, with each picture labelled by its pose.
 * Returns true so LiteGraph does not also start dragging the node.
 */
ModelPolasNode.prototype.onMouseDown = function (e, pos) {
  const top = this.size[1] - this._bottomAreaHeight()
  const i = thumbnailIndexAt(this._thumbEls, MARGIN, top, this.size[0] - MARGIN * 2, pos[0], pos[1])
  if (i < 0) return false
  showImage(this._lastImages.map((url, k) => ({ url, label: this._lastLabels[k] })))
  return true
}

/**
 * Called on every graph tick. Sends the first finished pola out of the output socket.
 */
ModelPolasNode.prototype.onExecute = function () {
  this.setOutputData(0, this._lastImages[0] || null)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Sends one fal.ai request for one pose and returns the finished picture as base64.
 * Throws an error with fal.ai's own explanation when the request is refused.
 */
ModelPolasNode.prototype._generatePose = async function (pose, imageData, apiKey, fullBodyData) {
  const params = { aspectRatio: this._aspectRatio.value, numImages: 1, outputFormat: 'png', resolution: this._resolution.value }
  // Passing the model's picture as a reference makes buildRequest use NB2's /edit endpoint
  const refs = [{ data: imageData, label: 'Model picture' }]
  // Pose line, then the swimwear for the chosen gender (same in all five pictures), then the shared ending
  const outfit = `The person is wearing ${OUTFITS[this._gender.value]}, barefoot, not the clothes from the reference image.`
  let prompt = `${pose.prompt} ${outfit} ${POLA_STYLE}`
  // When the Full body picture is ready, send it as a second reference so this pose copies its
  // swimwear, light and skin tone exactly — and say so in the prompt, or the model may ignore it
  if (fullBodyData) {
    refs.push({ data: fullBodyData, label: 'Full body result' })
    prompt += ' Match the second reference image exactly for the swimwear, lighting and skin tone.'
  }
  const { url, options } = buildRequest(prompt, { apiKey }, params, null, null, refs)
  const response = await fetch(url, options)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    // fal.ai puts its explanation in "detail" — sometimes text, sometimes a list of problems
    const detail = Array.isArray(err.detail) ? err.detail.map(d => d.msg || JSON.stringify(d)).join('; ') : (err.detail || response.statusText)
    throw new Error(`${response.status} ${detail}`)
  }
  const urls = parseResponse(await response.json())
  if (urls.length === 0) throw new Error('the model returned no image (it may have been blocked by the safety filter)')
  // fal.ai image links are temporary — keep the picture itself as base64
  return fetchAsBase64(urls[0])
}

/**
 * Makes the five polas in two rounds: first the Full body picture, then the other four at once,
 * each also given the Full body picture so the whole set matches. Then shows, stores and prices them.
 * One failed pose does not cancel the others; if Full body fails, the four use the source picture alone.
 */
ModelPolasNode.prototype._generate = async function () {
  // Ignore extra clicks while a set is already being made, so it is not paid for twice
  if (this._status === 'generating') return
  const imageData = this.getInputData(0)
  if (!imageData) return log('Model Polas: connect a picture of the model to the input first.', 'error')
  // Checked before anything is sent, so forgetting the gender never costs money
  if (!OUTFITS[this._gender.value]) return log('Model Polas: choose Female or Male first.', 'error')
  const apiKey = getFalaiApiKey()
  if (!apiKey) return log('Model Polas: enter your fal.ai API key in Settings.', 'error')

  this._setStatus('generating')
  // Round 1 — the Full body picture (first in POSES), which the other four will copy.
  // allSettled reports success or failure instead of stopping the whole set at the first error
  this._statusText = 'Generating full body (1 of 5)…'
  const [first] = await Promise.allSettled([this._generatePose(POSES[0], imageData, apiKey)])
  const fullBody = first.status === 'fulfilled' ? first.value : null
  if (!fullBody) log('Model Polas: the other pictures will use only the source picture, as "Full body" failed.', 'error')

  // Round 2 — the other four at the same time, each given the Full body picture when there is one
  this._statusText = 'Generating the other 4…'
  this.setDirtyCanvas(true, true)
  const rest = await Promise.allSettled(POSES.slice(1).map(p => this._generatePose(p, imageData, apiKey, fullBody)))
  const results = [first, ...rest]

  const images = [], labels = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') { images.push(r.value); labels.push(POSES[i].label) }
    else log(`Model Polas: "${POSES[i].label}" failed — ${r.reason.message}`, 'error')
  })
  if (images.length === 0) return this._setStatus('error')

  this._lastImages = images
  this._lastLabels = labels
  images.forEach((src, i) => saveToGallery(src, `Model Polas – ${labels[i]}`))
  // Only pictures that came back are paid for, so the cost counts those alone
  const cost = calculateCost({ resolution: this._resolution.value, numImages: images.length })
  addSpent(cost)
  log(`Model Polas: ${images.length} of ${POSES.length} pictures generated — ~$${cost.toFixed(2)}.`, 'success')
  this._showThumbnails()
}

/**
 * Loads the saved pictures as thumbnails and grows the node so they appear at its bottom.
 * Called after a generation and after the page reloads a saved graph.
 */
ModelPolasNode.prototype._showThumbnails = function () {
  loadThumbnails(this._lastImages, (els) => {
    this._thumbEls = els
    this._setStatus('idle')
  })
}

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Saves every pola to the user's computer, named by its pose (e.g. "pola-face-front.png").
 */
ModelPolasNode.prototype._download = function () {
  if (this._lastImages.length === 0) return log('Model Polas: generate the polas first before downloading.', 'error')
  this._lastImages.forEach((src, i) => {
    // The file extension comes from the image data itself (e.g. "data:image/png;base64,…")
    const ext = (src.match(/^data:image\/(\w+)/) || [, 'png'])[1]
    const a = document.createElement('a')
    a.href = src
    a.download = `pola-${this._lastLabels[i].toLowerCase().replace(/\s+/g, '-')}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  })
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph. Stores the last set of polas and their pose names.
 */
ModelPolasNode.prototype.onSerialize = function (info) {
  info.extra = { lastImages: this._lastImages, lastLabels: this._lastLabels }
}

/**
 * Called by LiteGraph when loading a saved graph. Restores the polas and redraws the thumbnails.
 */
ModelPolasNode.prototype.onConfigure = function (info) {
  if (info.extra) {
    this._lastImages = info.extra.lastImages || []
    this._lastLabels = info.extra.lastLabels || []
  }
  this._showThumbnails()
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/ModelPolas', ModelPolasNode)

export { ModelPolasNode }
