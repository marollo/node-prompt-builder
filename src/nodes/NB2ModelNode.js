/**
 * Defines the NB2 Model node — receives a prompt from the Prompt Assembler node
 * and sends it to the fal.ai Nano Banana 2 API.
 * All generation parameters live here as canvas widgets.
 */

import { LiteGraph } from 'litegraph.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setGenerationParams, setFormat, setResultCallback, setSocketImage, generate } from '../api/apiClient.js'
import { getStats, updateEstimate } from '../api/CostControl.js'
import { calculateCost } from '../api/formats/falai.js'
import {
  FALAI_ASPECT_RATIO,
  FALAI_NUM_IMAGES,
  FALAI_OUTPUT_FORMAT,
  FALAI_SAFETY,
  FALAI_RESOLUTION,
} from '../utils/nodeOptions.js'
import { fetchAsBase64 } from '../utils/imageUtils.js'
import { saveToGallery } from '../utils/galleryStore.js'
import { loadThumbnails, thumbnailGridHeight, drawThumbnailGrid, thumbnailIndexAt } from '../utils/thumbnailUtils.js'
import { showImage } from '../panel/ImageModal.js'

// Space in pixels around the thumbnail area at the bottom of the node
const THUMB_MARGIN = 8

// Height in pixels of the stats row (Spent / Est / Req)
const STATS_H = 36

// ─── Node class ────────────────────────────────────────────────────────────────

function NB2ModelNode() {
  this.size = [300, 260]

  // Prevent the user from resizing the node below a width where stats overlap
  this.min_size = [300, 100]

  // One input slot — receives the assembled prompt string from the Prompt Assembler node
  this.addInput('Prompt', 'string')

  // Second input slot — an optional picture from another node (e.g. another NB2 or Recraft),
  // sent to fal.ai as an extra reference image. Must stay second: other code reads the Prompt as input 0
  this.addInput('image', 'image')

  // One output slot — sends the first generated picture to another node (e.g. Camera Move, Qwen, Claude)
  this.addOutput('image', 'image')

  // No text fields — the side panel is used only for cost settings
  this.values = {}
  this.panelFields = []

  // ── Generation parameters ─────────────────────────────────────────────────
  this._aspectRatio  = this.addWidget('combo', 'Aspect Ratio',  'auto', null, { values: FALAI_ASPECT_RATIO })
  this._numImages    = this.addWidget('combo', 'Images',         '1',   null, { values: FALAI_NUM_IMAGES })
  this._outputFormat = this.addWidget('combo', 'Output Format',  'png', null, { values: FALAI_OUTPUT_FORMAT })
  this._resolution   = this.addWidget('combo', 'Resolution',     '1K',  null, { values: FALAI_RESOLUTION })
  // Safety default is "4" per the Nano Banana 2 API docs
  this._safety       = this.addWidget('combo', 'Safety',         '4',   null, { values: FALAI_SAFETY })

  // Stores the last batch of generated images as base64 strings for IndexedDB persistence
  this._lastImages = []

  // Picture elements built from _lastImages — used to draw the thumbnails on the node
  this._thumbEls = []

  // 'generating' while a request is running, so the node can say so; otherwise 'idle'
  this._status = 'idle'

  // Generate button — must be a plain (non-async) function: LiteGraph silently
  // ignores async functions here, which would leave the button doing nothing
  this.addWidget('button', 'Generate', null, () => { this._generate() })

  // Cost Settings button — opens the side panel with budget and cooldown controls
  this.addWidget('button', 'Cost Settings', null, () => openPanel(this))
}

NB2ModelNode.title = 'NB2 Model (fal.ai)'

// ─── _generate ────────────────────────────────────────────────────────────────

/**
 * Registers a result callback, then asks apiClient to generate.
 * While waiting, the node shows "Generating…"; when images arrive they appear as thumbnails.
 */
NB2ModelNode.prototype._generate = async function () {
  setResultCallback(async (urls) => {
    try {
      this._lastImages = await Promise.all(urls.map(u => fetchAsBase64(u)))
      for (const src of this._lastImages) saveToGallery(src, 'NB2 Model')
      this._showThumbnails()
    } catch (e) {
      // fetch failed — images stay visible in modal but won't persist
    }
  })
  // Show "Generating…" on the node until the request finishes (or is blocked)
  this._status = 'generating'
  this.size = this.computeSize()
  // Hand over the connected picture only now, at click time, so another NB2 node can't overwrite it
  setSocketImage(this.getInputData(1) || null)
  await generate()
  this._status = 'idle'
  this.size = this.computeSize()
}

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node must be.
 * Adds 36px to the standard widget height so the stats row always has its own space,
 * plus room for the thumbnails (or the "Generating…" line) underneath.
 * Without this LiteGraph shrinks the node to fit only the widgets, clipping the stats.
 */
NB2ModelNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  // Enforce minimum width so the three stat columns never overlap
  if (size[0] < 300) size[0] = 300
  size[1] += STATS_H + this._bottomAreaHeight()
  return size
}

// ─── _bottomAreaHeight ────────────────────────────────────────────────────────

/**
 * Returns how much space the area under the stats row needs: the thumbnails, or a "Generating…" line.
 * Both computeSize and the drawing code use it, so the pictures always fit inside the node.
 */
NB2ModelNode.prototype._bottomAreaHeight = function () {
  if (this._status === 'generating') return 24
  // _thumbEls may not exist yet — LiteGraph measures the node while it is still being built
  const h = thumbnailGridHeight(this._thumbEls || [], this.size[0] - THUMB_MARGIN * 2)
  return h > 0 ? h + THUMB_MARGIN : 0
}

// ─── _showThumbnails ──────────────────────────────────────────────────────────

/**
 * Loads the saved images as pictures and grows the node so they appear at its bottom.
 * Called after a generation finishes and after the page reloads a saved graph.
 */
NB2ModelNode.prototype._showThumbnails = function () {
  loadThumbnails(this._lastImages, (els) => {
    this._thumbEls = els
    this.size = this.computeSize()
    this.setDirtyCanvas(true, true)
  })
}

// ─── onResize ─────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph while the user drags the node's corner.
 * Wider node = bigger thumbnails, so the height is recalculated to keep them inside.
 */
NB2ModelNode.prototype.onResize = function (size) {
  size[1] = this.computeSize()[1]
}

// ─── onMouseDown ──────────────────────────────────────────────────────────────

/**
 * Opens the full-size image viewer when the user clicks one of the thumbnails.
 * Returns true to stop LiteGraph from also starting a node drag.
 */
NB2ModelNode.prototype.onMouseDown = function (e, pos) {
  const w = this.size[0] - THUMB_MARGIN * 2
  const top = this.size[1] - this._bottomAreaHeight()
  const i = thumbnailIndexAt(this._thumbEls, THUMB_MARGIN, top, w, pos[0], pos[1])
  if (i < 0) return false
  // Show every image from the last generation; the viewer lists them all
  showImage(this._lastImages.map(url => ({ url, label: null })))
  return true
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Reads the prompt from the input slot and pushes all current state into apiClient.
 * Also refreshes the cost stats drawn on the canvas.
 */
NB2ModelNode.prototype.onExecute = function () {
  // Tell apiClient which format is active — always NB2 for this node
  setFormat('Nano Banana 2')

  // Build the params object and push it into apiClient
  const params = {
    aspectRatio:  this._aspectRatio.value,
    numImages:    parseInt(this._numImages.value),
    outputFormat: this._outputFormat.value,
    resolution:   this._resolution.value,
    safety:       this._safety.value,
  }
  setGenerationParams(params)

  // Keep the estimated cost display in sync with current params.
  // Multiply by format count so batch mode shows the total estimated spend.
  updateEstimate(calculateCost(params) * this._getFormatCount())

  // Grey out Aspect Ratio when an Ad Format node upstream is controlling it
  this._aspectRatio.disabled = this._isAspectRatioOverridden()

  // Send the first generated picture out of the output socket (nothing until a generation has run)
  this.setOutputData(0, this._lastImages[0] || null)

  // Mark node as needing a canvas redraw so the stats stay current
  this.setDirtyCanvas(true)
}

// ─── _isAspectRatioOverridden ──────────────────────────────────────────────────

/**
 * Returns true when an Ad Format node is connected to the Prompt input
 * AND has at least one format selected.
 * In that case the aspect ratio is set per-format during batch generation,
 * so the Aspect Ratio widget on this node has no effect and should be disabled.
 */
NB2ModelNode.prototype._isAspectRatioOverridden = function () {
  // No connection on the Prompt input — nothing to check
  if (!this.inputs[0] || this.inputs[0].link == null) return false

  // Look up the actual link object to find which node is upstream
  const link = this.graph.links[this.inputs[0].link]
  if (!link) return false

  const sourceNode = this.graph.getNodeById(link.origin_id)

  // Only override when the upstream node is an Ad Format node with formats chosen
  return sourceNode &&
    sourceNode.type === 'prompt/AdFormat' &&
    sourceNode.selectedFormats.length > 0
}

// ─── _getFormatCount ───────────────────────────────────────────────────────────

/**
 * Returns how many ad formats are currently selected on the upstream Ad Format node.
 * Returns 1 when no Ad Format node is connected, so single-generation cost is unchanged.
 * Used to multiply the base cost estimate by the number of batch generations.
 */
NB2ModelNode.prototype._getFormatCount = function () {
  if (!this.inputs[0] || this.inputs[0].link == null) return 1
  const link = this.graph.links[this.inputs[0].link]
  if (!link) return 1
  const sourceNode = this.graph.getNodeById(link.origin_id)
  if (!sourceNode || sourceNode.type !== 'prompt/AdFormat') return 1
  return sourceNode.selectedFormats.length || 1
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the session stats (Spent, Est., Requests) and, below them, the last generated images.
 * Called by LiteGraph on every render frame.
 */
NB2ModelNode.prototype.onDrawForeground = function (ctx) {
  // When the node is collapsed only the title bar is visible — draw nothing extra
  if (this.flags.collapsed) return

  const stats  = getStats()
  const w      = this.size[0]
  // The stats row sits just above the thumbnail area (which fills the bottom of the node)
  const areaY  = this.size[1] - this._bottomAreaHeight()
  const lineY  = areaY - 30  // separator line position
  const textY  = areaY - 12  // stats text baseline

  // ── Result area — "Generating…" or the thumbnails of the last generation ──
  if (this._status === 'generating') {
    ctx.fillStyle = '#666'
    ctx.font      = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Generating…', w / 2, areaY + 14)
  } else {
    drawThumbnailGrid(ctx, this._thumbEls, THUMB_MARGIN, areaY, w - THUMB_MARGIN * 2)
  }

  // Draw a subtle separator line to visually separate stats from the last widget
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(8, lineY)
  ctx.lineTo(w - 8, lineY)
  ctx.stroke()

  // Divide the node into three equal columns and centre each stat within its column.
  // This guarantees no overlap regardless of the text length.
  const third = w / 3
  ctx.font = '11px monospace'
  ctx.fillStyle = '#aaa'
  ctx.textAlign = 'center'

  ctx.fillText(`Spent: $${stats.spent.toFixed(2)}`, third * 0.5, textY)
  ctx.fillText(`Est: ~$${stats.estimate.toFixed(2)}`, third * 1.5, textY)
  ctx.fillText(`Req: ${stats.requestCount}`,          third * 2.5, textY)

  // Reset alignment so other drawing code is not affected
  ctx.textAlign = 'left'
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Persists the last batch of generated images as base64 strings.
 */
NB2ModelNode.prototype.onSerialize = function (info) {
  info.extra = { lastImages: this._lastImages }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores the last generated images so they survive a page reload.
 */
NB2ModelNode.prototype.onConfigure = function (info) {
  if (info.extra) this._lastImages = info.extra.lastImages || []
  // Graphs saved before the output socket existed have no outputs — add it back so they get it too
  if (!this.outputs || this.outputs.length === 0) this.addOutput('image', 'image')
  // Same for the image input: older saves only have the Prompt input, so add the second one
  if (this.inputs.length < 2) this.addInput('image', 'image')
  // Rebuild the thumbnails so the last result is visible again after a reload
  this._showThumbnails()
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/NB2Model', NB2ModelNode)

export { NB2ModelNode }
