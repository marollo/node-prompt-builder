/**
 * Defines the Close-up node — turns a short "what to zoom in on" text into a
 * ready-made close-up prompt for a model node (NB2 or Recraft V4).
 * It also passes a connected picture straight through, so the model node
 * receives both the prompt and the picture to zoom into from one place.
 */

import { LiteGraph } from 'litegraph.js'

// The preset close-up instruction. {target} is replaced with whatever the user types.
const CLOSE_UP_PROMPT = 'Extreme close-up of {target} from the reference image, filling the frame, ' +
  'sharp focus on fine details and textures, shallow depth of field. ' +
  'Keep the same subject, colours, lighting and style.'

// ─── Node class ────────────────────────────────────────────────────────────────

function CloseUpNode() {
  this.size = [280, 80]

  // Receives the picture to zoom into (e.g. from an NB2 node's image output)
  this.addInput('image', 'image')

  // Output 0 — the finished close-up prompt, for a model node's Prompt input
  this.addOutput('Prompt', 'string')

  // Output 1 — the same picture that came in, for a model node's image input
  this.addOutput('image', 'image')

  // Text field drawn on the node — the object or part of the picture to close up on
  this._target = this.addWidget('text', 'Close-up on', '', null, {})

  // Tells LiteGraph to include the text field's value in the saved graph.
  // Without this, LiteGraph skips widget values and the typed text is lost on reload.
  this.serialize_widgets = true
}

CloseUpNode.title = 'Close-up'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Builds the close-up prompt from the preset and the typed text.
 * Returns an empty string when nothing is typed, so the model node reports "No prompt yet".
 */
CloseUpNode.prototype.getPromptFragment = function () {
  const target = (this._target.value || '').trim()
  if (!target) return ''
  return CLOSE_UP_PROMPT.replace('{target}', target)
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Sends the prompt out of output 0 and passes the incoming picture out of output 1.
 */
CloseUpNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
  this.setOutputData(1, this.getInputData(0) || null)
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/CloseUp', CloseUpNode)

export { CloseUpNode }
