/**
 * Defines the NB2 Model node — receives a prompt from the Prompt Assembler node
 * and sends it to the fal.ai Nano Banana 2 API.
 * All generation parameters live here as canvas widgets.
 */

import { LiteGraph } from 'litegraph.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setGenerationParams, setApiKey, setFormat, generate } from '../api/apiClient.js'
import { getStats, updateEstimate } from '../api/CostControl.js'
import { calculateCost } from '../api/formats/falai.js'
import {
  FALAI_ASPECT_RATIO,
  FALAI_NUM_IMAGES,
  FALAI_OUTPUT_FORMAT,
  FALAI_SAFETY,
  FALAI_RESOLUTION,
} from '../utils/nodeOptions.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function NB2ModelNode() {
  this.size = [300, 260]

  // Prevent the user from resizing the node below a width where stats overlap
  this.min_size = [300, 100]

  // One input slot — receives the assembled prompt string from the Prompt Assembler node
  this.addInput('Prompt', 'string')

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

  // API key entered directly on the canvas — visible to the user
  this._apiKey = this.addWidget('text', 'API Key', '', null, {})

  // Generate button — triggers image generation
  this.addWidget('button', 'Generate', null, () => generate())

  // Cost Settings button — opens the side panel with budget and cooldown controls
  this.addWidget('button', 'Cost Settings', null, () => openPanel(this))
}

NB2ModelNode.title = 'NB2 Model'

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node must be.
 * Adds 36px to the standard widget height so the stats row always has its own space.
 * Without this LiteGraph shrinks the node to fit only the widgets, clipping the stats.
 */
NB2ModelNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  // Enforce minimum width so the three stat columns never overlap
  if (size[0] < 300) size[0] = 300
  size[1] += 36
  return size
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

  // Push the API key from the canvas widget into apiClient every tick
  setApiKey(this._apiKey.value)

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
 * Draws the session stats (Spent, Est., Requests) directly on the node canvas.
 * Called by LiteGraph on every render frame.
 */
NB2ModelNode.prototype.onDrawForeground = function (ctx) {
  // When the node is collapsed only the title bar is visible — draw nothing extra
  if (this.flags.collapsed) return

  const stats  = getStats()
  const w      = this.size[0]
  const lineY  = this.size[1] - 30  // separator line position
  const textY  = this.size[1] - 12  // stats text baseline

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

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/NB2Model', NB2ModelNode)

export { NB2ModelNode }
