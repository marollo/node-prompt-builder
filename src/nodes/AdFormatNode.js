/**
 * Sits between the Prompt Assembler and the NB2 Model node.
 * Lets the user select ad formats; when Generate is clicked on NB2,
 * one image is generated per selected format using the correct aspect ratio.
 */

import { LiteGraph } from 'litegraph.js'
import { setSelectedFormats } from '../api/apiClient.js'
import { openPanel } from '../panel/AdFormatPanel.js'

function AdFormatNode() {
  this.title = 'Ad Format'
  this.size = [220, 80]

  // Prompt comes in from the Prompt Assembler
  this.addInput('Prompt', 'string')

  // Prompt passes through to the NB2 Model node
  this.addOutput('Prompt', 'string')

  // Which formats the user has checked in the panel
  this.selectedFormats = []

  this.addWidget('button', 'Select Formats', null, () => openPanel(this))
}

/**
 * Forces the node to be tall enough for the button widget plus the
 * status line drawn at the bottom — without this LiteGraph shrinks the
 * node and the text overlaps the button.
 */
AdFormatNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  if (size[0] < 220) size[0] = 220
  size[1] += 24
  return size
}

/**
 * Runs every graph tick.
 * Passes the prompt straight through and keeps apiClient in sync
 * with the current format selection.
 */
AdFormatNode.prototype.onExecute = function () {
  const prompt = this.getInputData(0) || ''
  this.setOutputData(0, prompt)
  setSelectedFormats(this.selectedFormats)
  this.setDirtyCanvas(true)
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Adds the list of selected ad formats to the save data.
 */
AdFormatNode.prototype.onSerialize = function (info) {
  info.extra = { selectedFormats: this.selectedFormats }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores the previously selected ad formats.
 */
AdFormatNode.prototype.onConfigure = function (info) {
  if (info.extra && info.extra.selectedFormats) {
    this.selectedFormats = info.extra.selectedFormats
  }
}

/**
 * Clears the format list in apiClient when this node is removed from the canvas.
 * Prevents the NB2 node from running a stale batch after the node is gone.
 */
AdFormatNode.prototype.onRemoved = function () {
  setSelectedFormats([])
}

/**
 * Draws the selected format count at the bottom of the node.
 * Green when formats are selected, dim grey when none are chosen.
 */
AdFormatNode.prototype.onDrawForeground = function (ctx) {
  const count = this.selectedFormats.length
  const label = count === 0
    ? 'No formats selected'
    : count + ' format' + (count === 1 ? '' : 's') + ' selected'

  ctx.font = '11px monospace'
  ctx.fillStyle = count === 0 ? '#555' : '#22c55e'
  ctx.textAlign = 'center'
  ctx.fillText(label, this.size[0] / 2, this.size[1] - 8)
  ctx.textAlign = 'left'
}

LiteGraph.registerNodeType('prompt/AdFormat', AdFormatNode)
