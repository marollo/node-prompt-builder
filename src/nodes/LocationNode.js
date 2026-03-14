/**
 * Defines the Location node — describes the setting or environment of the scene.
 * Contributes a fragment like: "urban exterior, neon-lit Tokyo alley, rainy atmosphere"
 */

import { LiteGraph } from 'litegraph.js'
import { LOCATION_SETTING_TYPE, LOCATION_ATMOSPHERE } from '../utils/nodeOptions.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function LocationNode() {
  this.size = [280, 130]

  // One output slot — connects to the Output node
  this.addOutput('out', 'string')

  // Text values stored on the node — edited via the side panel
  this.values = { location: 'crumbling gothic cathedral', extraDetails: '' }

  // Stores reference images uploaded via the side panel — each entry is { data }
  this.images = []

  // Label sent to the API to identify what role these images play
  this.referenceLabel = 'location reference'

  // Declares which fields the side panel shows for this node
  this.panelFields = [
    { label: 'Location description', key: 'location' },
    { label: 'Extra details',        key: 'extraDetails' }
  ]

  // Button that opens the side panel for text editing
  this.addWidget('button', 'Edit Location', null, () => openPanel(this))

  // Dropdown — what kind of setting this is
  this.addWidget('combo', 'Setting', LOCATION_SETTING_TYPE[0], null, { values: LOCATION_SETTING_TYPE })

  // Dropdown — the atmospheric condition of the environment
  this.addWidget('combo', 'Atmosphere', LOCATION_ATMOSPHERE[0], null, { values: LOCATION_ATMOSPHERE })
}

// Label shown in the node header
LocationNode.title = 'Location / Set'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Reads the current values and returns this node's contribution to the prompt.
 * Called by promptAssembler every time the Output node updates.
 */
LocationNode.prototype.getPromptFragment = function () {
  const location   = this.values.location
  const extra      = this.values.extraDetails

  // widget[0] is the Edit button, so combos start at [1]
  const setting    = this.widgets[1].value
  const atmosphere = this.widgets[2].value

  // If images are uploaded, build a prefix listing each image's purpose
  let prefix = ''
  if (this.images.length > 0) {
    const labels = this.images.map(img => img.label || this.referenceLabel)
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    prefix = 'Using the provided ' + joined + ', '
  }

  // Build the parts — setting and location are always included
  const parts = [setting.toLowerCase(), location]
  if (atmosphere && atmosphere !== 'None') parts.push(atmosphere.toLowerCase() + ' atmosphere')
  if (extra) parts.push(extra)

  return prefix + parts.filter(Boolean).join(', ')
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Passes this node's prompt fragment downstream via the output slot.
 */
LocationNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Location', LocationNode)

export { LocationNode }
