/**
 * Defines the Camera Preset node — controls the camera angle and lens.
 * Contributes a fragment like: "low angle shot, 85mm portrait lens, shallow depth of field"
 */

import { LiteGraph } from 'litegraph.js'
import { CAMERA_ANGLE, CAMERA_FOCAL_LENGTH } from '../utils/nodeOptions.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import cameraPrompt from '../prompts/camera.md?raw'
import { addClaudeStatsDrawing } from '../utils/claudeNodeDraw.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function CameraNode() {
  this.size = [280, 110]

  // One output slot — connects to the Output node
  this.addOutput('out', 'string')

  // Text values stored on the node — edited via the side panel
  this.values = { extraDetails: 'shallow depth of field, motion blur' }

  // Stores reference images uploaded via the side panel — each entry is { data }
  this.images = []

  // System prompt sent to Claude when the user clicks "Describe" on an image slot
  this.claudePrompt = cameraPrompt

  // Tracks total Claude API cost and call count for the stats bar drawn on the canvas
  this.claudeSpent     = 0
  this.claudeCallCount = 0

  // Label sent to the API to identify what role these images play
  this.referenceLabel = 'camera reference'

  // Declares which fields the side panel shows for this node
  this.panelFields = [
    { label: 'Extra camera details', key: 'extraDetails' }
  ]

  // Button that opens the side panel for text editing
  this.addWidget('button', 'Edit Camera', null, () => openPanel(this))

  // Dropdown — the camera angle
  this.addWidget('combo', 'Angle', CAMERA_ANGLE[0], null, { values: CAMERA_ANGLE })

  // Dropdown — the focal length / lens type
  this.addWidget('combo', 'Focal Length', CAMERA_FOCAL_LENGTH[0], null, { values: CAMERA_FOCAL_LENGTH })
}

// Label shown in the node header
CameraNode.title = 'Camera Preset'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Reads the current values and returns this node's contribution to the prompt.
 * Called by promptAssembler every time the Output node updates.
 */
CameraNode.prototype.getPromptFragment = function () {
  const extra = this.values.extraDetails

  // widget[0] is the Edit button, so combos start at [1]
  const angle       = this.widgets[1].value
  const focalLength = this.widgets[2].value

  // If images are uploaded, build a prefix listing each image's purpose
  let prefix = ''
  if (this.images.length > 0) {
    const labels = this.images.map(img => img.label || this.referenceLabel)
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    prefix = 'Using the provided ' + joined + ', '
  }

  const parts = [angle.toLowerCase() + ' shot', focalLength.toLowerCase() + ' lens']
  if (extra) parts.push(extra)

  return prefix + parts.filter(Boolean).join(', ')
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Passes this node's prompt fragment downstream via the output slot.
 */
CameraNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Adds our custom text values and uploaded images to the save data.
 */
CameraNode.prototype.onSerialize = function (info) {
  info.extra = { values: this.values, images: this.images }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores text values and uploaded images from the save data.
 */
CameraNode.prototype.onConfigure = function (info) {
  if (!info.extra) return
  if (info.extra.values) this.values = info.extra.values
  if (info.extra.images) this.images = info.extra.images
}

// ─── Claude stats bar ─────────────────────────────────────────────────────────

addClaudeStatsDrawing(CameraNode)

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Camera', CameraNode)

export { CameraNode }
