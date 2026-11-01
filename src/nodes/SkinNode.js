/**
 * Defines the Skin node — lets the user pick a new skin colour, age and skin
 * marks (freckles, moles…) for the person in a picture, and turns those choices
 * into a ready-made edit prompt for a model node (e.g. NB2).
 * It also passes the connected picture straight through, so the model node
 * receives both the prompt and the picture to edit from one place.
 */

import { LiteGraph } from 'litegraph.js'

// The choice that means "don't change this" — it adds nothing to the prompt
const KEEP = 'Keep original'

// Choices shown in each dropdown. Only this node uses them, so they live here.
const SKIN_COLOURS = [KEEP, 'Very fair', 'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark brown', 'Deep']
const AGES         = [KEEP, '20s', '30s', '40s', '50s', '60s', '70s+']
const SPOTS        = [KEEP, 'Clear skin (no spots)', 'Light freckles', 'Heavy freckles', 'Beauty marks/moles', 'Age spots', 'Light acne']

// Sentence added to the end of every prompt so the model changes only the skin
const KEEP_REST = 'Keep the same face, identity, pose, outfit, hair, lighting and background. Realistic natural skin texture.'

// ─── Node class ────────────────────────────────────────────────────────────────

function SkinNode() {
  this.size = [280, 110]

  // Receives the picture whose skin should change (e.g. from an Image or NB2 node)
  this.addInput('image', 'image')

  // Output 0 — the finished skin prompt, for a model node's Prompt input
  this.addOutput('Prompt', 'string')

  // Output 1 — the same picture that came in, for a model node's image input
  this.addOutput('image', 'image')

  // The three dropdowns drawn on the node; all start at "Keep original"
  this._colour = this.addWidget('combo', 'Skin colour', KEEP, null, { values: SKIN_COLOURS })
  this._age    = this.addWidget('combo', 'Age',         KEEP, null, { values: AGES })
  this._spots  = this.addWidget('combo', 'Spots',       KEEP, null, { values: SPOTS })

  // Tells LiteGraph to save the dropdown choices with the graph, so they survive a reload
  this.serialize_widgets = true
}

SkinNode.title = 'Skin'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Builds the skin-edit prompt from the three dropdown choices.
 * Returns an empty string when nothing is changed, so the model node reports "No prompt yet".
 */
SkinNode.prototype.getPromptFragment = function () {
  // Collect one short instruction for every dropdown that is not "Keep original"
  const changes = []
  if (this._colour.value !== KEEP) changes.push(`${this._colour.value.toLowerCase()} skin tone`)
  if (this._age.value !== KEEP)    changes.push(`skin that looks like a person in their ${this._age.value}`)
  if (this._spots.value !== KEEP)  changes.push(this._spots.value.toLowerCase())
  if (changes.length === 0) return ''
  return `Edit the skin of the person in the reference image: ${changes.join(', ')}. ${KEEP_REST}`
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Sends the prompt out of output 0 and passes the incoming picture out of output 1.
 */
SkinNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
  this.setOutputData(1, this.getInputData(0) || null)
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Skin', SkinNode)

export { SkinNode }
