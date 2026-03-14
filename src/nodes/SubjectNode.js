/**
 * Defines the Subject node — describes what is in the image.
 * Contributes a fragment like: "a woman in a leather jacket, single subject, rule of thirds left"
 */

import { LiteGraph } from 'litegraph.js'
import { SUBJECT_COUNT, SUBJECT_POSITION } from '../utils/nodeOptions.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function SubjectNode() {
  this.size = [280, 130]

  // One output slot — the user drags a wire from here to the Output node
  this.addOutput('out', 'string')

  // Text values stored directly on the node — edited via the side panel
  this.values = { subject: 'a young woman in a leather jacket', extraDetails: '' }

  // Stores reference images uploaded via the side panel — each entry is { data }
  // where data is a base64 image string
  this.images = []

  // Label sent to the API to identify what role these images play
  this.referenceLabel = 'subject reference'

  // Declares which fields the side panel should show for this node
  this.panelFields = [
    { label: 'Subject', key: 'subject' },
    { label: 'Extra details', key: 'extraDetails' }
  ]

  // Button that opens the side panel for text editing
  this.addWidget('button', 'Edit Subject', null, () => openPanel(this))

  // Widget: how many subjects are in the scene
  this.addWidget('combo', 'Count', SUBJECT_COUNT[0], null, { values: SUBJECT_COUNT })

  // Widget: where the subject sits in the frame
  this.addWidget('combo', 'Position', SUBJECT_POSITION[0], null, { values: SUBJECT_POSITION })
}

// Label shown in the node header
SubjectNode.title = 'Subject'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Reads the current widget values and returns this node's contribution
 * to the final prompt as a plain string.
 * Called by promptAssembler every time the Output node updates.
 */
SubjectNode.prototype.getPromptFragment = function () {
  // Read text values from this.values (edited via the side panel)
  const subject  = this.values.subject
  const extra    = this.values.extraDetails

  // Read combo values from widgets — widget[0] is the Edit button, so combos are [1] and [2]
  const count    = this.widgets[1].value
  const position = this.widgets[2].value

  // If images are uploaded, build a prefix listing each image's purpose
  let prefix = ''
  if (this.images.length > 0) {
    const labels = this.images.map(img => img.label || this.referenceLabel)
    const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
    prefix = 'Using the provided ' + joined + ', '
  }

  // Build an array of non-empty parts and join them with commas
  const parts = [subject]
  if (count)    parts.push(count.toLowerCase() + ' subject')
  if (position) parts.push(position.toLowerCase())
  if (extra)    parts.push(extra)

  return prefix + parts.filter(Boolean).join(', ')
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Passes this node's prompt fragment downstream via the output slot.
 */
SubjectNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Subject', SubjectNode)

export { SubjectNode }
