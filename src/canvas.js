/**
 * Sets up the LiteGraph canvas and starts the graph running.
 * This is the foundation everything else is built on top of.
 */

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js'

// Import node types — each import registers them with LiteGraph automatically
import './nodes/PromptAssemblerNode.js'
import './nodes/NB2ModelNode.js'
import './nodes/AdFormatNode.js'
import './nodes/SubjectNode.js'
import './nodes/LocationNode.js'
import './nodes/CameraNode.js'
import './nodes/LightingNode.js'
import './nodes/StyleMoodNode.js'

// Remove all built-in LiteGraph node types so only our custom nodes appear
// in the search list when the user double-clicks the canvas.
// Our nodes are all registered under the 'prompt/' category.
for (const type in LiteGraph.registered_node_types) {
  if (!type.startsWith('prompt/')) {
    delete LiteGraph.registered_node_types[type]
  }
}

/**
 * Creates the graph, attaches it to the canvas element, and adds a default
 * Output node to the centre of the canvas so the user has somewhere to start.
 * Returns the graph instance so other modules can read from it later.
 */
export function initCanvas() {

  // Create the graph — the data model that holds all nodes and links
  const graph = new LGraph()

  // Find the <canvas> element in index.html
  const canvasEl = document.getElementById('graph-canvas')

  // The log bar at the bottom is 80px tall — subtract it so the canvas does not
  // extend behind the bar and hide nodes placed near the bottom of the window
  const LOG_BAR_HEIGHT = 80

  // Size the canvas to fill the window above the log bar
  canvasEl.width  = window.innerWidth
  canvasEl.height = window.innerHeight - LOG_BAR_HEIGHT

  // Create the renderer — draws the graph onto the canvas element
  const graphCanvas = new LGraphCanvas(canvasEl, graph)

  // Set the background to our dark theme colour, remove the default grid image
  graphCanvas.background_image = null
  graphCanvas.clear_background_color = '#1a1a1a'

  // Resize the canvas whenever the browser window is resized
  window.addEventListener('resize', () => {
    canvasEl.width  = window.innerWidth
    canvasEl.height = window.innerHeight - LOG_BAR_HEIGHT
    graphCanvas.setDirty(true, true)
  })

  // Add the Prompt Assembler node — collects content nodes and builds the prompt
  const assemblerNode = LiteGraph.createNode('prompt/PromptAssembler')
  graph.add(assemblerNode)
  assemblerNode.pos = [300, 200]

  // Add the NB2 Model node — receives the prompt and sends it to the API
  const modelNode = LiteGraph.createNode('prompt/NB2Model')
  graph.add(modelNode)
  modelNode.pos = [650, 200]

  // Start the graph — begins the render loop
  graph.start()

  return graph
}
