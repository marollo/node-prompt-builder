/**
 * Defines the Lighting Preset node — controls the lighting setup and time of day.
 * Contributes a fragment like: "golden hour lighting, dusk, warm tones, long shadows"
 */

import { LiteGraph } from 'litegraph.js'
import { LIGHTING_STYLE, LIGHTING_TIME_OF_DAY } from '../utils/nodeOptions.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function LightingNode() {
  this.size = [280, 110]

  // One output slot — connects to the Output node
  this.addOutput('out', 'string')

  // Text values stored on the node — edited via the side panel
  this.values = { extraDetails: 'warm tones, long shadows' }

  // Stores reference images uploaded via the side panel — each entry is { data }
  this.images = []

  // Label sent to the API to identify what role these images play
  this.referenceLabel = 'lighting reference'

  // Declares which fields the side panel shows for this node
  this.panelFields = [
    { label: 'Extra lighting details', key: 'extraDetails' }
  ]

  // Button that opens the side panel for text editing
  this.addWidget('button', 'Edit Lighting', null, () => openPanel(this))

  // Dropdown — the lighting style or source
  this.addWidget('combo', 'Style', LIGHTING_STYLE[0], null, { values: LIGHTING_STYLE })

  // Dropdown — time of day affecting the light quality
  this.addWidget('combo', 'Time of Day', LIGHTING_TIME_OF_DAY[0], null, { values: LIGHTING_TIME_OF_DAY })
}

// Label shown in the node header
LightingNode.title = 'Lighting Preset'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Reads the current values and returns this node's contribution to the prompt.
 * Called by promptAssembler every time the Output node updates.
 */
LightingNode.prototype.getPromptFragment = function () {
  const extra = this.values.extraDetails

  // widget[0] is the Edit button, so combos start at [1]
  const style     = this.widgets[1].value
  const timeOfDay = this.widgets[2].value

  // If images are uploaded, build a prefix listing each image's purpose
  let prefix = ''
  if (this.images.length > 0) {
    const labels = this.images.map(img => img.label || this.referenceLabel)
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    prefix = 'Using the provided ' + joined + ', '
  }

  const parts = [style.toLowerCase() + ' lighting']
  if (timeOfDay && timeOfDay !== 'Not Applicable') parts.push(timeOfDay.toLowerCase())
  if (extra) parts.push(extra)

  return prefix + parts.filter(Boolean).join(', ')
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Passes this node's prompt fragment downstream via the output slot.
 */
LightingNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Adds our custom text values and uploaded images to the save data.
 */
LightingNode.prototype.onSerialize = function (info) {
  info.extra = { values: this.values, images: this.images }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores text values and uploaded images from the save data.
 */
LightingNode.prototype.onConfigure = function (info) {
  if (!info.extra) return
  if (info.extra.values) this.values = info.extra.values
  if (info.extra.images) this.images = info.extra.images
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Lighting', LightingNode)

export { LightingNode }
