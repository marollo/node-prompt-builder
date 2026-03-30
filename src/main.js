/**
 * Entry point for the Node Prompt Builder application.
 * This is the first file the browser runs — it boots everything else.
 */

import { initCanvas } from './canvas.js'

// Start the LiteGraph canvas as soon as the page is ready
// ApiPanel, CostControl and ContextControl are now loaded on demand
// by PropertiesPanel when the Output node side panel is opened
// initCanvas is async because it reads from IndexedDB before creating nodes
const graph = await initCanvas()
