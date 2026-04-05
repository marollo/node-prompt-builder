/**
 * Sets up the LiteGraph canvas and starts the graph running.
 * This is the foundation everything else is built on top of.
 */

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js'
import { saveGraph, loadGraph } from './utils/storageUtils.js'

// Import node types — each import registers them with LiteGraph automatically
import './nodes/PromptAssemblerNode.js'
import './nodes/NB2ModelNode.js'
import './nodes/RecraftV4ModelNode.js'
import './nodes/AdFormatNode.js'
import './nodes/SubjectNode.js'
import './nodes/LocationNode.js'
import './nodes/CameraNode.js'
import './nodes/LightingNode.js'
import './nodes/StyleMoodNode.js'

// Remove all built-in LiteGraph node types so only our custom nodes appear
// in the search list when the user double-clicks the canvas.
// Our nodes are registered under 'prompt/' (content nodes) and 'model/' (model nodes).
for (const type in LiteGraph.registered_node_types) {
  if (!type.startsWith('prompt/') && !type.startsWith('model/')) {
    delete LiteGraph.registered_node_types[type]
  }
}

/**
 * Creates the graph, attaches it to the canvas element, and adds a default
 * Output node to the centre of the canvas so the user has somewhere to start.
 * On reload, restores the previously saved graph from IndexedDB instead of
 * creating empty defaults — so the user never loses their work.
 * Returns the graph instance so other modules can read from it later.
 */
export async function initCanvas() {

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

  // Disable LiteGraph's built-in dark-blue border drawn around the canvas edge
  graphCanvas.render_canvas_border = false

  // Resize the canvas whenever the browser window is resized
  window.addEventListener('resize', () => {
    canvasEl.width  = window.innerWidth
    canvasEl.height = window.innerHeight - LOG_BAR_HEIGHT
    graphCanvas.setDirty(true, true)
  })

  // Try to restore a previously saved graph from IndexedDB
  const saved = await loadGraph()

  if (saved) {
    // Migrate old node type strings — model nodes moved from prompt/ to model/ category.
    // Without this, any graph saved before the rename would create broken ghost nodes
    // for the unknown types, corrupting the graph state and breaking all connections.
    if (saved.nodes) {
      saved.nodes.forEach(node => {
        if (node.type === 'prompt/NB2Model')       node.type = 'model/NB2Model'
        if (node.type === 'prompt/RecraftV4Model') node.type = 'model/RecraftV4Model'
      })
    }

    // Saved state found — restore all nodes, connections, and custom data
    graph.configure(saved)
  } else {
    // First run — create the default starter node
    const assemblerNode = LiteGraph.createNode('prompt/PromptAssembler')
    graph.add(assemblerNode)
    assemblerNode.pos = [300, 200]
  }

  // Auto-save the graph to IndexedDB every 2 seconds.
  // This covers all types of changes: adding nodes, drawing wires,
  // editing text, changing dropdowns, uploading images.
  setInterval(() => saveGraph(graph.serialize()), 2000)

  // Add the "New Project" button to the top-right corner of the screen
  _addNewProjectButton(graph)

  // Start the graph — begins the render loop
  graph.start()

  return graph
}

/**
 * Creates and injects the "New Project" button into the page.
 * When clicked, asks for confirmation then wipes all nodes and IndexedDB,
 * and restores the two default starter nodes so the user has a clean slate.
 */
function _addNewProjectButton(graph) {
  const btn = document.createElement('button')
  btn.id = 'new-project-btn'
  btn.textContent = 'New Project'
  document.body.appendChild(btn)

  btn.addEventListener('click', () => {
    // Ask before destroying anything — this cannot be undone
    const confirmed = window.confirm('Clear the canvas and start a new project?\nThis cannot be undone.')
    if (!confirmed) return

    // Remove all nodes and connections from the graph
    graph.clear()

    // Wipe the IndexedDB save so the next page reload also starts fresh
    saveGraph(null)

    // Recreate the default starter node
    const assemblerNode = LiteGraph.createNode('prompt/PromptAssembler')
    graph.add(assemblerNode)
    assemblerNode.pos = [300, 200]
  })
}
