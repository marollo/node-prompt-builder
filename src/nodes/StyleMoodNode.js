/**
 * Defines the Style / Mood node — sets the artistic style and emotional tone.
 * Contributes a fragment like: "cinematic style, dramatic mood, high contrast, desaturated"
 */

import { LiteGraph } from 'litegraph.js'
import { STYLE_VISUAL, STYLE_MOOD } from '../utils/nodeOptions.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function StyleMoodNode() {
  this.size = [280, 110]

  // One output slot — connects to the Output node
  this.addOutput('out', 'string')

  // Text values stored on the node — edited via the side panel
  this.values = { extraDetails: '' }

  // Stores reference images uploaded via the side panel — each entry is { data }
  this.images = []

  // Label sent to the API to identify what role these images play
  this.referenceLabel = 'style reference'

  // Declares which fields the side panel shows for this node
  this.panelFields = [
    { label: 'Extra style details', key: 'extraDetails' }
  ]

  // Button that opens the side panel for text editing
  this.addWidget('button', 'Edit Style', null, () => openPanel(this))

  // Dropdown — the visual / artistic style
  this.addWidget('combo', 'Style', STYLE_VISUAL[0], null, { values: STYLE_VISUAL })

  // Dropdown — the emotional mood of the image
  this.addWidget('combo', 'Mood', STYLE_MOOD[0], null, { values: STYLE_MOOD })
}

// Label shown in the node header
StyleMoodNode.title = 'Style / Mood'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Reads the current values and returns this node's contribution to the prompt.
 * Called by promptAssembler every time the Output node updates.
 */
StyleMoodNode.prototype.getPromptFragment = function () {
  const extra = this.values.extraDetails

  // widget[0] is the Edit button, so combos start at [1]
  const style = this.widgets[1].value
  const mood  = this.widgets[2].value

  // If images are uploaded, build a prefix listing each image's purpose
  let prefix = ''
  if (this.images.length > 0) {
    const labels = this.images.map(img => img.label || this.referenceLabel)
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    prefix = 'Using the provided ' + joined + ', '
  }

  const parts = [style.toLowerCase() + ' style', mood.toLowerCase() + ' mood']
  if (extra) parts.push(extra)

  return prefix + parts.filter(Boolean).join(', ')
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Passes this node's prompt fragment downstream via the output slot.
 */
StyleMoodNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/StyleMood', StyleMoodNode)

export { StyleMoodNode }
