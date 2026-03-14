/**
 * Defines the Prompt Assembler node — collects all connected content nodes
 * and assembles their text into a single structured prompt string.
 * Sends the assembled prompt downstream via its output slot to a model node.
 */

import { LiteGraph } from 'litegraph.js'
import { assemblePrompt, assembleImages } from '../assembly/promptAssembler.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setPrompt, setReferenceImages } from '../api/apiClient.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function PromptAssemblerNode() {
  this.size = [280, 90]

  // Five fixed input slots in Google framework order: Subject → Location → Camera → Lighting → Style
  this.addInput('Subject',  '*')
  this.addInput('Location', '*')
  this.addInput('Camera',   '*')
  this.addInput('Lighting', '*')
  this.addInput('Style',    '*')

  // One output slot — sends the assembled prompt string to a connected model node
  this.addOutput('Prompt', 'string')

  // The assembled prompt text — stored here and shown read-only in the side panel
  this.values = { prompt: 'Connect nodes to build your prompt…' }

  // Declares what the side panel shows — a single readonly assembled prompt field
  this.panelFields = [{ label: 'Assembled Prompt', key: 'prompt', readonly: true }]

  // Button that opens the side panel to read the assembled prompt
  this.addWidget('button', 'View Prompt', null, () => openPanel(this))

  // Button that copies the assembled prompt to the clipboard
  this.addWidget('button', 'Copy Prompt', null, () => {
    navigator.clipboard.writeText(this.values.prompt)
  })
}

PromptAssemblerNode.title = 'Prompt Assembler'

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Assembles the prompt from all connected content nodes and passes it downstream.
 */
PromptAssemblerNode.prototype.onExecute = function () {
  const prompt = assemblePrompt(this)
  this.values.prompt = prompt || 'Connect nodes to build your prompt…'

  // If the side panel is open, push the new prompt into the display textarea live
  const display = document.getElementById('prompt-display')
  if (display) display.value = this.values.prompt

  // Keep apiClient in sync with the latest prompt and reference images
  setPrompt(this.values.prompt)
  setReferenceImages(assembleImages(this))

  // Send the assembled prompt string downstream to any connected model node
  this.setOutputData(0, this.values.prompt)
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/PromptAssembler', PromptAssemblerNode)

export { PromptAssemblerNode }
