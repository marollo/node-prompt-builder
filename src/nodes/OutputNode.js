/**
 * Defines the Output node — the final destination of the node graph.
 * All other nodes connect into this one. It assembles their text into
 * a single prompt string and displays it in a multi-line text area
 * that grows with the content.
 */

import { LiteGraph } from 'litegraph.js'
import { assemblePrompt, assembleImages } from '../assembly/promptAssembler.js'
import { open as openPanel } from '../panel/PropertiesPanel.js'
import { setPrompt, setGenerationParams, setReferenceImages, generate } from '../api/apiClient.js'
import {
  FALAI_ASPECT_RATIO,
  FALAI_NUM_IMAGES,
  FALAI_OUTPUT_FORMAT,
  FALAI_SAFETY,
  FALAI_RESOLUTION,
} from '../utils/nodeOptions.js'

// ─── Node class ────────────────────────────────────────────────────────────────

function OutputNode() {
  this.size = [280, 110]

  // Five fixed input slots in the correct Google framework order:
  // Subject → Location → Camera → Lighting → Style
  // The assembler iterates these in slot order, so the prompt always follows this sequence.
  this.addInput('Subject',  '*')
  this.addInput('Location', '*')
  this.addInput('Camera',   '*')
  this.addInput('Lighting', '*')
  this.addInput('Style',    '*')

  // The assembled prompt — stored here, shown read-only in the side panel
  this.values = { prompt: 'Connect nodes to build your prompt…' }

  // Declares what the side panel shows for this node — read-only since it is assembled
  this.panelFields = [{ label: 'Assembled Prompt', key: 'prompt', readonly: true }]

  // Button that opens the side panel to view the assembled prompt
  this.addWidget('button', 'View Prompt', null, () => openPanel(this))

  // Copy button — copies the assembled prompt to the clipboard
  this.addWidget('button', 'Copy Prompt', null, () => {
    navigator.clipboard.writeText(this.values.prompt)
  })

  // ── fal.ai generation parameters ──────────────────────────────────────────
  // Stored as widget references so onExecute can read their current values

  this._aspectRatio  = this.addWidget('combo', 'Aspect Ratio',  'auto', null, { values: FALAI_ASPECT_RATIO })
  this._numImages    = this.addWidget('combo', 'Images',         '1',    null, { values: FALAI_NUM_IMAGES })
  this._outputFormat = this.addWidget('combo', 'Output Format',  'png',  null, { values: FALAI_OUTPUT_FORMAT })
  this._resolution   = this.addWidget('combo', 'Resolution',     '1K',   null, { values: FALAI_RESOLUTION })
  // Safety default is "4" per the Nano Banana 2 API docs
  this._safety       = this.addWidget('combo', 'Safety',         '4',    null, { values: FALAI_SAFETY })

}

OutputNode.title = 'Output'

// ─── onExecute ────────────────────────────────────────────────────────────────

/**
 * Called on every graph tick.
 * Assembles the prompt from all connected nodes and stores it in this.values.
 */
OutputNode.prototype.onExecute = function () {
  const prompt = assemblePrompt(this)
  this.values.prompt = prompt || 'Connect nodes to build your prompt…'

  // If the side panel is open, push the new prompt text into the display textarea live
  const display = document.getElementById('prompt-display')
  if (display) display.value = this.values.prompt

  // Keep apiClient in sync — prompt, params, and reference images update every tick
  setPrompt(this.values.prompt)

  // Collect reference images from all connected nodes and pass them to apiClient
  setReferenceImages(assembleImages(this))

  // Pass the current fal.ai parameters to apiClient on every tick
  setGenerationParams({
    aspectRatio:  this._aspectRatio.value,
    numImages:    parseInt(this._numImages.value),
    outputFormat: this._outputFormat.value,
    resolution:   this._resolution.value,
    safety:       this._safety.value,
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────

LiteGraph.registerNodeType('prompt/Output', OutputNode)

export { OutputNode }
