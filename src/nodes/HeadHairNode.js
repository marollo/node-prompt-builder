/**
 * Defines the Head Hair node — lets the user pick a new hair style, colour and
 * length for the person in a picture, and turns those choices into a ready-made
 * edit prompt for a model node (e.g. NB2) (backlog #17).
 * Built the same way as the Skin node: it also passes the connected picture
 * straight through, so the model node gets the prompt and the picture from one place.
 */

import { LiteGraph } from 'litegraph.js'

// The choice that means "don't change this" — it adds nothing to the prompt
const KEEP = 'Keep original'

// What each dropdown choice says in the prompt. The keys are what the user sees;
// the values are fuller descriptions, because a bare word like "Bun" or "Chin" is unclear to the model.
// Only this node uses them, so they live here (like the Skin node's lists)
const STYLES = {
  'Straight':     'straight hair',
  'Wavy':         'wavy hair',
  'Curly':        'curly hair',
  'Coily':        'tightly coiled hair',
  'Bob':          'a bob haircut',
  'Pixie':        'a pixie cut',
  'Bun':          'hair tied up in a bun',
  'Ponytail':     'hair tied back in a ponytail',
  'Braids':       'braided hair',
  'Buzz cut':     'a buzz cut',
  'Slicked back': 'hair slicked back',
}
const COLOURS = ['Black', 'Dark brown', 'Brown', 'Light brown', 'Dark blonde', 'Blonde', 'Platinum', 'Auburn', 'Red', 'Grey', 'White']
const LENGTHS = {
  'Shaved':     'a shaved head with the hair cut down to the scalp',
  'Very short': 'very short hair',
  'Short':      'short hair',
  'Chin':       'chin-length hair',
  'Shoulder':   'shoulder-length hair',
  'Long':       'long hair reaching past the shoulders',
  'Very long':  'very long hair reaching the middle of the back',
}

// Sentence added after the chosen changes. The opposite of the Skin node: here the face and skin are
// protected by name, and the eyebrows too, because a new hair colour can tempt the model to recolour them
const KEEP_REST = 'Do not change anything else: keep exactly the same face, identity, facial features, ' +
  'skin tone, eyebrows, makeup, pose, body, outfit, lighting and background. Realistic natural hair texture.'

// ─── Node class ────────────────────────────────────────────────────────────────

function HeadHairNode() {
  this.size = [280, 110]

  // Receives the picture whose hair should change (e.g. from an Image or NB2 node)
  this.addInput('image', 'image')

  // Output 0 — the finished hair prompt, for a model node's Prompt input
  this.addOutput('Prompt', 'string')

  // Output 1 — the same picture that came in, for a model node's image input
  this.addOutput('image', 'image')

  // The three dropdowns drawn on the node; all start at "Keep original".
  // Short labels: the node title already says "Head Hair", and longer ones ran into the value
  this._style  = this.addWidget('combo', 'Style',  KEEP, null, { values: [KEEP, ...Object.keys(STYLES)] })
  this._colour = this.addWidget('combo', 'Colour', KEEP, null, { values: [KEEP, ...COLOURS] })
  this._length = this.addWidget('combo', 'Length', KEEP, null, { values: [KEEP, ...Object.keys(LENGTHS)] })

  // Tells LiteGraph to save the dropdown choices with the graph, so they survive a reload
  this.serialize_widgets = true
}

HeadHairNode.title = 'Head Hair'

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Builds the hair-edit prompt from the three dropdown choices.
 * Returns an empty string when nothing is changed, so the model node reports "No prompt yet".
 */
HeadHairNode.prototype.getPromptFragment = function () {
  // Collect one short instruction for every dropdown that is not "Keep original"
  const changes = []
  if (this._style.value !== KEEP)  changes.push(STYLES[this._style.value])
  if (this._colour.value !== KEEP) changes.push(`${this._colour.value.toLowerCase()} hair colour`)
  if (this._length.value !== KEEP) changes.push(LENGTHS[this._length.value])
  if (changes.length === 0) return ''
  // "Change ONLY the hair" goes first — models pay most attention to the start of a prompt
  return `Change ONLY the hair on the head of the person in the reference image: ${changes.join(', ')}. ${KEEP_REST}`
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Sends the prompt out of output 0 and passes the incoming picture out of output 1.
 */
HeadHairNode.prototype.onExecute = function () {
  this.setOutputData(0, this.getPromptFragment())
  this.setOutputData(1, this.getInputData(0) || null)
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/HeadHair', HeadHairNode)

export { HeadHairNode }
