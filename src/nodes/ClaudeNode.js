/**
 * Defines the Claude node — takes an image input and returns a text description.
 * The user picks a description type from a dropdown, clicks Describe, and the
 * generated text is stored on the node and passed downstream via the output socket.
 * Lives in the "model" category alongside the other generation nodes.
 */

import { LiteGraph } from 'litegraph.js'
import { describeImage } from '../api/claudeClient.js'
import { log } from '../panel/LogPanel.js'

// Import every prompt file — the user picks which one applies at runtime
import subjectPrompt   from '../prompts/subject.md?raw'
import locationPrompt  from '../prompts/location.md?raw'
import cameraPrompt    from '../prompts/camera.md?raw'
import lightingPrompt  from '../prompts/lighting.md?raw'
import styleMoodPrompt from '../prompts/styleMood.md?raw'

// Maps the dropdown label the user sees to the system prompt sent to Claude
const PROMPT_MAP = {
  'Subject':     subjectPrompt,
  'Location':    locationPrompt,
  'Camera':      cameraPrompt,
  'Lighting':    lightingPrompt,
  'Style / Mood': styleMoodPrompt,
}

const DESCRIPTION_TYPES = Object.keys(PROMPT_MAP)

// ─── Node class ────────────────────────────────────────────────────────────────

function ClaudeNode() {
  // Reserve space for widgets and the text area below them
  this.size = [280, 60]

  // Receives a base64 image data URL from a connected Image node
  this.addInput('image', 'image')

  // Passes the generated description text to connected nodes
  this.addOutput('out', 'string')

  // The text returned by Claude after a Describe call — null until first run
  this.outputText = null

  // Tracks the current state so the text area can show the right content
  // Possible values: 'idle' | 'generating' | 'done' | 'error'
  this.status = 'idle'

  // Dropdown — which description style to request from Claude
  this.addWidget('combo', 'Type', DESCRIPTION_TYPES[0], null, { values: DESCRIPTION_TYPES })

  // Button — kicks off the Claude API call when clicked
  this.addWidget('button', 'Describe', null, () => this._describe())
}

ClaudeNode.title = 'Claude'

// ─── _describe ────────────────────────────────────────────────────────────────

/**
 * Reads the connected image and calls Claude with the selected prompt.
 * Updates this.outputText and this.status when the response arrives.
 * Called when the user clicks the Describe button.
 */
ClaudeNode.prototype._describe = async function () {
  const imageData = this.getInputData(0)

  if (!imageData) {
    log('Claude node: connect an Image node to the input first.', 'error')
    return
  }

  // Pick the system prompt that matches the selected description type
  const typeName    = this.widgets[0].value
  const systemPrompt = PROMPT_MAP[typeName]

  // Show "generating…" in the text area while waiting for the response
  this.status     = 'generating'
  this.outputText = null
  this.setDirtyCanvas(true, true)

  const result = await describeImage(imageData, systemPrompt)

  if (!result) {
    // describeImage already logged the error — just update status
    this.status = 'error'
  } else {
    this.outputText = result.text
    this.status     = 'done'
  }

  this.setDirtyCanvas(true, true)
}

// ─── getPromptFragment ────────────────────────────────────────────────────────

/**
 * Returns the generated text so the Prompt Assembler can include it.
 * assemblePrompt() calls this method on every node connected to the assembler —
 * without it the Claude node's output is silently skipped.
 */
ClaudeNode.prototype.getPromptFragment = function () {
  return this.outputText || ''
}

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph on every tick.
 * Outputs whatever text is currently stored on the node.
 */
ClaudeNode.prototype.onExecute = function () {
  this.setOutputData(0, this.outputText)
}

// ─── computeSize ──────────────────────────────────────────────────────────────

/**
 * Tells LiteGraph how tall this node must be.
 * Adds 130px below the widgets to make room for the text area.
 */
ClaudeNode.prototype.computeSize = function () {
  const size = LiteGraph.LGraphNode.prototype.computeSize.call(this)
  size[1] += 130
  return size
}

// ─── _wrapText ────────────────────────────────────────────────────────────────

/**
 * Splits text into lines that each fit within maxWidth pixels.
 * Returns an array of strings — one per line.
 * Used by onDrawForeground to word-wrap the generated description.
 */
function _wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line    = ''

  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }

  if (line) lines.push(line)
  return lines
}

// ─── onDrawForeground ─────────────────────────────────────────────────────────

/**
 * Draws the text area at the bottom of the node on every render frame.
 * Shows a placeholder when idle, a spinner message when generating,
 * and the word-wrapped description when text is available.
 */
ClaudeNode.prototype.onDrawForeground = function (ctx) {
  if (this.flags.collapsed) return

  const margin = 8
  const boxH   = 120
  const boxX   = margin
  const boxY   = this.size[1] - boxH - margin
  const boxW   = this.size[0] - margin * 2

  // Dark background rectangle for the text area
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, 4)
  ctx.fill()

  // Subtle border so the text area reads as a distinct region
  ctx.strokeStyle = '#333'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, 4)
  ctx.stroke()

  ctx.font      = '11px monospace'
  ctx.textAlign = 'left'

  const textX    = boxX + 8
  const textY    = boxY + 16
  const lineH    = 15
  const maxW     = boxW - 16
  // How many lines fit inside the box before they would overflow
  const maxLines = Math.floor((boxH - 16) / lineH)

  if (this.status === 'generating') {
    ctx.fillStyle = '#888'
    ctx.fillText('Generating…', textX, textY)
  } else if (this.status === 'error') {
    ctx.fillStyle = '#c0392b'
    ctx.fillText('Error — check the log bar.', textX, textY)
  } else if (!this.outputText) {
    ctx.fillStyle = '#444'
    ctx.fillText('Connect an image and click Describe.', textX, textY)
  } else {
    ctx.fillStyle = '#ccc'
    const lines = _wrapText(ctx, this.outputText, maxW)
    lines.slice(0, maxLines).forEach((line, i) => {
      ctx.fillText(line, textX, textY + i * lineH)
    })
  }

  // Reset alignment so other canvas drawing is not affected
  ctx.textAlign = 'left'
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Called by LiteGraph when saving the graph.
 * Persists the generated text and status so they survive a page reload.
 */
ClaudeNode.prototype.onSerialize = function (info) {
  info.extra = { outputText: this.outputText, status: this.status }
}

/**
 * Called by LiteGraph when loading a saved graph.
 * Restores the generated text and status from the save data.
 */
ClaudeNode.prototype.onConfigure = function (info) {
  if (!info.extra) return
  if (info.extra.outputText !== undefined) this.outputText = info.extra.outputText
  if (info.extra.status     !== undefined) this.status     = info.extra.status
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('model/Claude', ClaudeNode)

export { ClaudeNode }
