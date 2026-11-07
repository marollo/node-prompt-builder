/**
 * Sets up the LiteGraph canvas and starts the graph running.
 * This is the foundation everything else is built on top of.
 */

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js'
import { saveGraph, loadGraph } from './utils/storageUtils.js'
import { openSettings } from './panel/SettingsModal.js'
import { openGallery } from './panel/GalleryModal.js'
import { log } from './panel/LogPanel.js'

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
import './nodes/ImageNode.js'
import './nodes/ClaudeNode.js'
import './nodes/CameraMoveNode.js'
import './nodes/QwenMultiAngleNode.js'
import './nodes/CloseUpNode.js'
import './nodes/SkinNode.js'
import './nodes/ModelPolasNode.js'

// Remove all built-in LiteGraph node types so only our custom nodes appear
// in the search list when the user double-clicks the canvas.
// Our nodes are registered under 'prompt/' (content nodes) and 'model/' (model nodes).
for (const type in LiteGraph.registered_node_types) {
  if (!type.startsWith('prompt/') && !type.startsWith('model/') && !type.startsWith('media/')) {
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

  // On Retina / HiDPI screens the physical pixel density is 2× (or more).
  // Setting the canvas pixel buffer to CSS size produces blurry rendering.
  // Multiplying by devicePixelRatio makes the buffer match the physical screen pixels.
  const dpr = window.devicePixelRatio || 1

  // Size the canvas pixel buffer at full physical resolution
  canvasEl.width  = window.innerWidth  * dpr
  canvasEl.height = (window.innerHeight - LOG_BAR_HEIGHT) * dpr

  // Keep the CSS display size unchanged so the canvas fills the same area on screen
  canvasEl.style.width  = window.innerWidth + 'px'
  canvasEl.style.height = (window.innerHeight - LOG_BAR_HEIGHT) + 'px'

  // Create the renderer — draws the graph onto the canvas element
  const graphCanvas = new LGraphCanvas(canvasEl, graph)

  // Patch LiteGraph's coordinate-to-canvas transform to include the dpr scale.
  // toCanvasContext is called before every graph draw to apply zoom and pan.
  // By prepending ctx.scale(dpr, dpr) here, the pixel buffer is used at full
  // physical resolution without touching ds.scale — which controls zoom level
  // and must stay at 1 so click coordinates remain correct.
  const ds = graphCanvas.ds
  const origToCanvas = ds.toCanvasContext.bind(ds)
  ds.toCanvasContext = function (ctx) {
    ctx.scale(dpr, dpr)
    origToCanvas(ctx)
  }

  // Set the background to our dark theme colour, remove the default grid image
  graphCanvas.background_image = null
  graphCanvas.clear_background_color = '#1a1a1a'

  // Disable LiteGraph's built-in dark-blue border drawn around the canvas edge
  graphCanvas.render_canvas_border = false

  // Resize the canvas whenever the browser window is resized
  window.addEventListener('resize', () => {
    canvasEl.width  = window.innerWidth  * dpr
    canvasEl.height = (window.innerHeight - LOG_BAR_HEIGHT) * dpr
    canvasEl.style.width  = window.innerWidth + 'px'
    canvasEl.style.height = (window.innerHeight - LOG_BAR_HEIGHT) + 'px'
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

  // Add the "Settings" button to the top-left corner of the screen
  _addSettingsButton()

  // Add the "Gallery" button next to Settings
  _addGalleryButton()

  // Stop one broken node from silently freezing every other node
  _guardAgainstNodeErrors(graph)

  // Start the graph — begins the render loop
  graph.start()

  return graph
}

/**
 * Keeps the graph running when a node crashes, and shows the error in the log bar.
 * By default LiteGraph hides the error and switches the whole graph off, so
 * every node (including the Prompt Assembler) stops updating with no message.
 */
function _guardAgainstNodeErrors(graph) {
  const originalRunStep = graph.runStep.bind(graph)

  // Remembers which errors were already shown — a broken node fails on every
  // tick (many times per second), so each distinct error is shown only once
  const alreadyReported = new Set()

  graph.runStep = function (num, _ignored, limit) {
    try {
      // "true" tells LiteGraph to let the error reach us instead of stopping
      originalRunStep(num, true, limit)
    } catch (err) {
      const message = 'Node error: ' + (err && err.message ? err.message : err)
      if (alreadyReported.has(message)) return
      alreadyReported.add(message)
      console.error(message, err)
      log(message, 'error')
    }
  }
}

/**
 * Creates and injects the "Settings" button into the top-left corner.
 * Clicking it opens the settings modal where the Claude API key can be entered.
 */
function _addSettingsButton() {
  const btn = document.createElement('button')
  btn.id = 'settings-btn'
  btn.textContent = 'Settings'
  document.body.appendChild(btn)
  btn.addEventListener('click', openSettings)
}

/**
 * Creates and injects the "Gallery" button next to the Settings button.
 * Clicking it opens the gallery modal showing all images saved to IndexedDB.
 */
function _addGalleryButton() {
  const btn = document.createElement('button')
  btn.id = 'gallery-btn'
  btn.textContent = 'Gallery'
  document.body.appendChild(btn)
  btn.addEventListener('click', openGallery)
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

    // LiteGraph's clear() quietly switches the graph off (it stops the "tick"
    // that makes every node update). Without this line, after New Project the
    // Prompt Assembler never reads its connected nodes again and stays empty
    // until the page is reloaded (backlog #20).
    graph.start()
  })
}
