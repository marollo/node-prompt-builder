/**
 * Defines the Recraft V4 Pro Model node — receives a prompt from the Prompt Assembler
 * and sends it to the fal.ai Recraft V4 Pro text-to-image API.
 * This model is text-to-image only — reference images are not supported.
 */

import { LiteGraph } from 'litegraph.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setGenerationParams, setApiKey, setFormat, generate } from '../api/apiClient.js'
import { getStats, updateEstimate } from '../api/CostControl.js'
import { calculateCost } from '../api/formats/recraftV4.js'
import { RECRAFT_IMAGE_SIZE, RECRAFT_SAFETY } from '../utils/nodeOptions.js'

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

  // API key entered directly on the canvas
  this._apiKey = this.addWidget('text', 'API Key', '', null, {})

  // Generate button — triggers image generation
  this.addWidget('button', 'Generate', null, () => generate())

  // Cost Settings button — opens the side panel with budget and cooldown controls
  this.addWidget('button', 'Cost Settings', null, () => openPanel(this))

  // Internal flag — true when any upstream node has reference images attached
  this._hasReferenceImages = false
}

RecraftV4ModelNode.title = 'Recraft V4 Pro'

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
  return size
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

  // Push the API key from the canvas widget into apiClient every tick
  setApiKey(this._apiKey.value)

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
 * Called by LiteGraph on every render frame.
 */
RecraftV4ModelNode.prototype.onDrawForeground = function (ctx) {
  // When the node is collapsed only the title bar is visible — draw nothing extra
  if (this.flags.collapsed) return

  const stats = getStats()
  const w     = this.size[0]

  // ── Warning banner ────────────────────────────────────────────────────────
  if (this._hasReferenceImages) {
    const warnY = this.size[1] - 50

    // Yellow background strip behind the warning text
    ctx.fillStyle = '#78350f'
    ctx.fillRect(8, warnY, w - 16, 18)

    ctx.font      = '10px monospace'
    ctx.fillStyle = '#fbbf24'
    ctx.textAlign = 'center'
    ctx.fillText('⚠ Reference images ignored — text-to-image only', w / 2, warnY + 12)
  }

  // ── Stats row ─────────────────────────────────────────────────────────────
  const lineY = this.size[1] - 30
  const textY = this.size[1] - 12

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

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/RecraftV4Model', RecraftV4ModelNode)

export { RecraftV4ModelNode }
