/**
 * Defines the Recraft V4 Pro Model node — receives a prompt from the Prompt Assembler
 * and sends it to the fal.ai Recraft V4 Pro text-to-image API.
 * This model is text-to-image only — reference images are not supported.
 */

import { LiteGraph } from 'litegraph.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setGenerationParams, setFormat, setResultCallback, generate } from '../api/apiClient.js'
import { getStats, updateEstimate } from '../api/CostControl.js'
import { calculateCost } from '../api/formats/recraftV4.js'
import { RECRAFT_IMAGE_SIZE, RECRAFT_SAFETY } from '../utils/nodeOptions.js'
import { fetchAsBase64 } from '../utils/imageUtils.js'
import { saveToGallery } from '../utils/galleryStore.js'
import { loadThumbnails, thumbnailGridHeight, drawThumbnailGrid, thumbnailIndexAt } from '../utils/thumbnailUtils.js'
import { showImage } from '../panel/ImageModal.js'

// Space in pixels around the thumbnail area at the bottom of the node
const THUMB_MARGIN = 8

// ─── Node class ────────────────────────────────────────────────────────────────

function RecraftV4ModelNode() {
  this.size = [300, 220]
  this.min_size = [300, 100]

  // One input slot — receives the assembled prompt string from the Prompt Assembler node
  this.addInput('Prompt', 'string')

  // No side-panel text fields — panel is used only for cost settings
  this.values = {}
  this.panelFields = []

  // ── Generation parameters ─────────────────────────────────────────────────
  this._imageSize = this.addWidget('combo', 'Image Size', 'square_hd', null, { values: RECRAFT_IMAGE_SIZE })
  this._safety    = this.addWidget('combo', 'Safety Checker', 'on', null, { values: RECRAFT_SAFETY })

  // Stores the last generated image as base64 strings for IndexedDB persistence
  this._lastImages = []

  // Picture elements built from _lastImages — used to draw the thumbnail on the node
  this._thumbEls = []

  // 'generating' while a request is running, so the node can say so; otherwise 'idle'
  this._status = 'idle'

  // Generate button — must be a plain (non-async) function: LiteGraph silently
  // ignores async functions here, which would leave the button doing nothing
  this.addWidget('button', 'Generate', null, () => { this._generate() })

  // Cost Settings button — opens the side panel with budget and cooldown controls
  this.addWidget('button', 'Cost Settings', null, () => openPanel(this))

  // Internal flag — true when any upstream node has reference images attached
  this._hasReferenceImages = false
}

RecraftV4ModelNode.title = 'Recraft V4 Pro (fal.ai)'

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node must be.
 * Adds extra height for the stats row and, when needed, the warning row.
 */
RecraftV4ModelNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  if (size[0] < 300) size[0] = 300
  // Base extra: 36px for stats row. Add 20px more when the warning is visible.
  size[1] += this._hasReferenceImages ? 56 : 36
  // Plus room for the thumbnail (or the "Generating…" line) at the very bottom
  size[1] += this._bottomAreaHeight()
  return size
}

// ─── _generate ────────────────────────────────────────────────────────────────

/**
 * Registers a result callback, then asks apiClient to generate.
 * While waiting, the node shows "Generating…"; when the image arrives it appears as a thumbnail.
 */
RecraftV4ModelNode.prototype._generate = async function () {
  setResultCallback(async (urls) => {
    try {
      this._lastImages = await Promise.all(urls.map(u => fetchAsBase64(u)))
      for (const src of this._lastImages) saveToGallery(src, 'Recraft V4 Pro')
      this._showThumbnails()
    } catch (e) {
      // fetch failed — images stay visible in modal but won't persist
    }
  })
  // Show "Generating…" on the node until the request finishes (or is blocked)
  this._status = 'generating'
  this.size = this.computeSize()
  await generate()
  this._status = 'idle'
  this.size = this.computeSize()
}

// ─── _bottomAreaHeight ────────────────────────────────────────────────────────

/**
 * Returns how much space the area under the stats row needs: the thumbnail, or a "Generating…" line.
 * Both computeSize and the drawing code use it, so the picture always fits inside the node.
 */
RecraftV4ModelNode.prototype._bottomAreaHeight = function () {
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
RecraftV4ModelNode.prototype._showThumbnails = function () {
  loadThumbnails(this._lastImages, (els) => {
    this._thumbEls = els
    this.size = this.computeSize()
    this.setDirtyCanvas(true, true)
  })
}

// ─── onResize ─────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph while the user drags the node's corner.
 * Wider node = bigger thumbnail, so the height is recalculated to keep it inside.
 */
RecraftV4ModelNode.prototype.onResize = function (size) {
  size[1] = this.computeSize()[1]
}

// ─── onMouseDown ──────────────────────────────────────────────────────────────

/**
 * Opens the full-size image viewer when the user clicks the thumbnail.
 * Returns true to stop LiteGraph from also starting a node drag.
 */
RecraftV4ModelNode.prototype.onMouseDown = function (e, pos) {
  const w = this.size[0] - THUMB_MARGIN * 2
  const top = this.size[1] - this._bottomAreaHeight()
  const i = thumbnailIndexAt(this._thumbEls, THUMB_MARGIN, top, w, pos[0], pos[1])
  if (i < 0) return false
  showImage(this._lastImages.map(url => ({ url, label: null })))
  return true
}

// ─── _collectReferenceImages ───────────────────────────────────────────────────

/**
 * Walks all nodes connected to the Prompt input and checks whether any of them
 * have reference images attached (stored in node.images).
 * Returns true if at least one image is found — used to show the warning banner.
 */
RecraftV4ModelNode.prototype._collectReferenceImages = function () {
  if (!this.inputs[0] || this.inputs[0].link == null) return false

  // Walk from the Prompt Assembler upstream through all content nodes
  const link = this.graph.links[this.inputs[0].link]
  if (!link) return false

  const assembler = this.graph.getNodeById(link.origin_id)
  if (!assembler) return false

  // The Prompt Assembler has 5 input slots — check each connected content node
  for (let i = 0; i < assembler.inputs.length; i++) {
    const slot = assembler.inputs[i]
    if (slot.link == null) continue

    const contentLink = this.graph.links[slot.link]
    if (!contentLink) continue

    const contentNode = this.graph.getNodeById(contentLink.origin_id)
    if (contentNode && contentNode.images && contentNode.images.length > 0) {
      return true
    }
  }

  return false
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Pushes all current settings into apiClient and refreshes the canvas display.
 */
RecraftV4ModelNode.prototype.onExecute = function () {
  // Tell apiClient which format is active — always Recraft V4 for this node
  setFormat('Recraft V4')

  // Build the params object and push it into apiClient
  const params = {
    imageSize: this._imageSize.value,
    safety:    this._safety.value,
  }
  setGenerationParams(params)

  // Recraft V4 is always $0.25 per generation — no resolution tiers
  updateEstimate(calculateCost())

  // Check whether any upstream content node has reference images
  this._hasReferenceImages = this._collectReferenceImages()

  // Mark node as needing a canvas redraw so stats and warning stay current
  this.setDirtyCanvas(true)
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the session stats row on the node canvas.
 * If reference images are detected upstream, also draws a yellow warning banner.
 * The last generated image is drawn at the very bottom, below the stats.
 * Called by LiteGraph on every render frame.
 */
RecraftV4ModelNode.prototype.onDrawForeground = function (ctx) {
  // When the node is collapsed only the title bar is visible — draw nothing extra
  if (this.flags.collapsed) return

  const stats = getStats()
  const w     = this.size[0]
  // The warning and stats rows sit just above the thumbnail area (which fills the bottom of the node)
  const areaY = this.size[1] - this._bottomAreaHeight()

  // ── Result area — "Generating…" or the thumbnail of the last generation ──
  if (this._status === 'generating') {
    ctx.fillStyle = '#666'
    ctx.font      = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Generating…', w / 2, areaY + 14)
  } else {
    drawThumbnailGrid(ctx, this._thumbEls, THUMB_MARGIN, areaY, w - THUMB_MARGIN * 2)
  }

  // ── Warning banner ────────────────────────────────────────────────────────
  if (this._hasReferenceImages) {
    const warnY = areaY - 50

    // Yellow background strip behind the warning text
    ctx.fillStyle = '#78350f'
    ctx.fillRect(8, warnY, w - 16, 18)

    ctx.font      = '10px monospace'
    ctx.fillStyle = '#fbbf24'
    ctx.textAlign = 'center'
    ctx.fillText('⚠ Reference images ignored — text-to-image only', w / 2, warnY + 12)
  }

  // ── Stats row ─────────────────────────────────────────────────────────────
  const lineY = areaY - 30
  const textY = areaY - 12

  // Subtle separator line above the stats
  ctx.strokeStyle = '#444'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(8, lineY)
  ctx.lineTo(w - 8, lineY)
  ctx.stroke()

  // Three equal columns: Spent / Est / Requests
  const third = w / 3
  ctx.font      = '11px monospace'
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
 * Persists the last generated image as base64 strings.
 */
RecraftV4ModelNode.prototype.onSerialize = function (info) {
  info.extra = { lastImages: this._lastImages }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores the last generated images so they survive a page reload.
 */
RecraftV4ModelNode.prototype.onConfigure = function (info) {
  if (info.extra) this._lastImages = info.extra.lastImages || []
  // Rebuild the thumbnail so the last result is visible again after a reload
  this._showThumbnails()
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/RecraftV4Model', RecraftV4ModelNode)

export { RecraftV4ModelNode }
