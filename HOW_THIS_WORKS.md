# How This Works

This document is a plain English map of the codebase. It is updated after every completed feature.

---

## What exists right now

- A dark LiteGraph canvas fills the full browser window
- Two nodes appear on the canvas at startup: **Prompt Assembler** and **NB2 Model**
- Seven node types are available by double-clicking the canvas: Subject, Location, Camera, Lighting, Style/Mood, Prompt Assembler, NB2 Model — LiteGraph's built-in nodes are hidden
- The graph flow is: content nodes → Prompt Assembler → NB2 Model → API → image modal

**Prompt Assembler node**
- Has five fixed input slots in Google framework order: Subject, Location, Camera, Lighting, Style
- Has one output slot that sends the assembled prompt string to the NB2 Model node
- "View Prompt" button opens the side panel showing the assembled prompt (updates live)
- "Copy Prompt" button copies to clipboard

**NB2 Model node**
- Has one input slot that receives the prompt string from the Prompt Assembler
- Canvas widgets: Aspect Ratio, Images, Output Format, Resolution, Safety, API Key
- "Generate" button triggers image generation
- "Cost Settings" button opens the side panel with Budget and Cooldown inputs
- Bottom of the node shows three live stats drawn directly on the canvas: Spent / Est. / Req
- All generation state (API key, params, format) is pushed into `apiClient.js` on every tick

**Shared behaviour**
- The assembled prompt uses sentence structure: each node's contribution is a separate clause capitalised at the start, joined with `". "`
- When a node has reference images uploaded, its section opens with `"Using the provided [label], "` — following the multimodal prompting formula
- Each reference image has its own editable label below the thumbnail (defaults to the node's role)
- The software automatically picks text-to-image or image editing mode based on whether reference images exist
- When multiple images are generated the modal shows them all in a grid, each with an "Open full size" link
- Context Control is currently disabled — each generation is always independent (mode locked to Open)
- A log bar runs across the bottom of the window showing API responses and errors with timestamps

---

## Folder structure

```
/
├── index.html                        ← The one HTML page the browser loads
├── package.json                      ← Lists tools the project depends on (Vite, LiteGraph)
├── src/
│   ├── main.js                       ← Entry point — boots the canvas when the page loads
│   ├── canvas.js                     ← Sets up LiteGraph, registers nodes, starts render loop
│   ├── styles.css                    ← All styles — dark theme variables, layout, canvas sizing
│   ├── nodes/
│   │   ├── PromptAssemblerNode.js    ← Collects connected nodes and assembles the prompt — BUILT
│   │   ├── NB2ModelNode.js           ← Receives prompt, sends it to fal.ai Nano Banana 2 — BUILT
│   │   ├── SubjectNode.js            ← Describes the image subject — BUILT
│   │   ├── LocationNode.js           ← Describes the environment — BUILT
│   │   ├── CameraNode.js             ← Controls camera angle and lens — BUILT
│   │   ├── LightingNode.js           ← Controls lighting setup — BUILT
│   │   ├── StyleMoodNode.js          ← Controls visual style and mood — BUILT
│   │   └── ReferenceImageNode.js     ← Standalone reference image node — placeholder (not built)
│   ├── panel/
│   │   ├── PropertiesPanel.js        ← Side panel for editing node text fields and images — BUILT
│   │   ├── ImageModal.js             ← Full-screen overlay showing generated images — BUILT
│   │   ├── LogPanel.js               ← Fixed bottom bar showing API responses and errors — BUILT
│   │   ├── CostPanel.js              ← Cost and budget UI — placeholder
│   │   └── ContextPanel.js           ← Context mode UI — placeholder
│   ├── assembly/
│   │   └── promptAssembler.js        ← Assembles prompt and reference images from connected nodes — BUILT
│   ├── api/
│   │   ├── ApiPanel.js               ← Getter functions for Model, URL, API key — read from side panel DOM — BUILT
│   │   ├── apiClient.js              ← Sends prompt + reference images to API; stores latest state — BUILT
│   │   ├── genericRest.js            ← Shapes prompt into a generic REST request body — BUILT
│   │   ├── CostControl.js            ← Budget, spend, cooldown — state in module vars, UI built on demand — BUILT
│   │   ├── ContextControl.js         ← Open/Closed mode — UI disabled, always returns 'open' — BUILT
│   │   └── formats/
│   │       ├── falai.js              ← Nano Banana 2 formatter — auto-routes t2i vs edit, cost calc — BUILT
│   │       ├── automatic1111.js      ← Automatic1111 request format — placeholder
│   │       └── comfyui.js            ← ComfyUI request format — placeholder
│   └── utils/
│       ├── nodeOptions.js            ← All dropdown data for all nodes — BUILT
│       ├── imageUtils.js             ← Image helpers — placeholder
│       └── storageUtils.js           ← Save/load helpers — placeholder
├── public/                           ← Static assets (empty for now)
└── docs/                             ← Plain English documentation per subsystem
```

---

## How the pieces connect

### Boot sequence
1. Browser loads `index.html`
2. `index.html` loads `styles.css` and `main.js`
3. `main.js` calls `initCanvas()` from `canvas.js`
4. `canvas.js` imports all node files — each import registers the node type with LiteGraph
5. `canvas.js` deletes all LiteGraph built-in node types, leaving only our `prompt/` nodes
6. `canvas.js` creates the `LGraph` (data) and `LGraphCanvas` (renderer)
7. One Prompt Assembler node and one NB2 Model node are added to the canvas automatically
8. The graph starts its render and execution loop

### When the user connects a content node to the Prompt Assembler
1. On the next graph tick, `onExecute` fires on the Prompt Assembler node
2. `onExecute` calls `assemblePrompt(this)` from `promptAssembler.js`
3. The assembler loops through all five fixed input slots, calls `getPromptFragment()` on each connected node
4. Each fragment is capitalised and joined with `". "` to form separate sentences
5. The result is written to `this.values.prompt` and pushed to `apiClient` via `setPrompt()`
6. The prompt string is also sent downstream via `this.setOutputData(0, prompt)` to the NB2 Model node
7. If the side panel is open, the `#prompt-display` textarea is updated immediately

### When the user edits a widget on a connected node
1. The widget value updates immediately
2. On the next graph tick, `onExecute` fires on the Prompt Assembler node again
3. The assembler re-reads all `getPromptFragment()` values
4. The prompt text updates automatically — both in `this.values.prompt` and in the side panel

### When the user clicks "View Prompt" on the Prompt Assembler
1. The button widget calls `PropertiesPanel.open(this)` — passing the Prompt Assembler node
2. The panel shows a single read-only textarea displaying the assembled prompt
3. The textarea has the fixed ID `prompt-display` — `onExecute` writes to it every tick
4. The panel stays open and shows live updates without needing to be closed and reopened

### When the user clicks an "Edit" button on a content node
1. The button widget calls `PropertiesPanel.open(this)` — passing the node itself
2. The panel reads `node.panelFields` — an array declaring which fields to show
3. For each field it creates a labeled `<textarea>` pre-filled with `node.values[key]`
4. Every keystroke syncs back to `node.values[key]` via an `input` event listener
5. On the next graph tick, `getPromptFragment()` reads from `node.values` and the prompt updates live
6. Below the text fields, the panel renders the Reference Images section
7. The panel stays open until the user clicks ✕

### When the user clicks "Cost Settings" on the NB2 Model node
1. `PropertiesPanel.open(this)` opens with the NB2 Model node
2. The panel has no text fields (NB2 Model's `panelFields` is empty)
3. Because the node title is "NB2 Model", the panel builds the Cost Settings section via `initCostUI()`
4. The Generate button in the panel is wired to `generate()` in `apiClient.js`

### When the user clicks Generate

1. The Generate button in the NB2 Model side panel is clicked
2. It calls `generate()` in `apiClient.js`
3. `generate()` first calls `canGenerate()` from `CostControl.js` — stops if cooldown is active or budget is reached
4. If the prompt is still the placeholder text, stops with "No prompt yet"
5. The stored `_apiKey` and `_format` variables (set each tick by NB2ModelNode's `onExecute`) are used directly — no DOM reads needed
6. If model is `Nano Banana 2`: `buildRequest()` from `falai.js` is called with the prompt, params, and `_referenceImages`
   - If `_referenceImages` has entries → uses the `/edit` endpoint, adds `image_urls` to the body
   - If no reference images → uses the standard text-to-image endpoint
7. If model is `Generic REST`: `buildRequest()` from `genericRest.js` shapes a simple `{ "prompt": "..." }` body
8. `fetch(url, options)` sends the POST request
9. On success:
    - `parseFalaiResponse(data)` extracts all image URLs as an array
    - `showImage(imageUrls)` opens the modal overlay with a grid of all images
    - `addSpent(calculateCost(params))` updates cumulative spend
    - `recordGeneration()` increments the counter and starts the cooldown
10. Errors show on the button; CORS errors are detected and explained in the console

### How the cooldown timer works

1. After a successful generation, `recordGeneration()` reads the cooldown seconds from the panel input
2. The Generate button is disabled and its label changes to `"Wait 3s…"`
3. Every second the countdown decrements and the label updates
4. When it reaches zero the button re-enables — unless the budget was also reached, in which case it stays disabled showing `"Budget reached"`
5. If the cooldown input is set to 0, no timer runs and the button stays active immediately

### When the user uploads a reference image
1. The user clicks "+ Add image" in the panel — this triggers a hidden `<input type="file">`
2. The browser's file picker opens — accepts JPG, PNG, WebP
3. On file selection, `FileReader.readAsDataURL()` converts the image to a base64 string
4. The result is pushed into `node.images` as `{ data: 'base64...' }`
5. `renderSlots()` redraws the slot list — a 120×120 thumbnail appears with a ✕ button
6. Clicking ✕ splices the image out of `node.images` and redraws the list
7. On the next graph tick, `onExecute` on the Output node calls `assembleImages(this)` — this loops through all connected nodes, reads their `node.images` and `node.referenceLabel`, and returns a flat array of `{ data, label }` objects
8. That array is passed to `apiClient.js` via `setReferenceImages()` — stored as `_referenceImages`
9. When Generate is clicked, `_referenceImages` is passed to `falai.js` which includes the images in the request body if any are present
10. The Add button hides automatically once 4 images are loaded

---

## Key concepts

**LGraph** — the data model. Holds all nodes, their values, and the links between them. Does not draw anything.

**LGraphCanvas** — the renderer. Reads from LGraph and draws it on the HTML canvas. Handles mouse interaction.

**Node registration** — every node file calls `LiteGraph.registerNodeType('category/Name', NodeClass)` at the end. Importing the file in `canvas.js` is enough to register it.

**getPromptFragment()** — a method every content node defines. Returns a lowercase string representing that node's contribution to the final prompt. If the node has reference images, the string opens with `"Using the provided [label], "`. The assembler capitalises the first letter and joins sections with `". "`. The assembler calls this without needing to know what type of node it's dealing with.

**Fixed input slots on the Prompt Assembler** — five slots in Google framework order: Subject, Location, Camera, Lighting, Style. Named slots make the expected connection order obvious and enforce the framework sequence regardless of the order the user draws wires.

**node.values** — every node stores its text field values directly on itself as a plain object (e.g. `this.values = { subject: '...', extraDetails: '' }`). The side panel reads and writes here. `getPromptFragment()` reads here too.

**node.images** — every content node stores its uploaded reference images here as an array. Each entry is `{ data: string, label: string }` where `data` is a base64-encoded image and `label` is the user's description of what that specific image is for. The side panel reads and writes this array. `getPromptFragment()` reads it to build the prompt prefix. `assembleImages()` reads it to collect images for the API request.

**node.referenceLabel** — a fixed string on every content node that describes the role of its images (e.g. `'subject reference'`, `'camera reference'`). Set once in each node's constructor. Used as the default value when `img.label` has not been edited by the user.

**node.panelFields** — every node declares an array describing which fields the side panel should show. Each entry has a `label` (shown above the textarea), a `key` (matches a key in `node.values`), and an optional `readonly` flag. The NB2 Model node has an empty `panelFields` — its panel only shows the cost section.

**PropertiesPanel** — a single shared panel. It is created once in the DOM and reused by every node. Opening it for a different node clears the previous content and rebuilds from that node's `panelFields`.

**nodeOptions.js** — the single source of truth for all dropdown lists. Edit here to change any dropdown in any node.

**CostControl.js** — owns all session cost state. Budget, cooldown, spent amount, and request count are stored in module-level variables so they survive the side panel being closed and reopened. `initCostUI(container)` builds the HTML into the NB2 Model side panel on demand. Exposes `canGenerate()`, `recordGeneration()`, `addSpent(amount)`, `updateEstimate(cost)`, and `getStats()`. `getStats()` returns the current numbers as a plain object so the NB2 Model node can draw them on the canvas without needing the side panel to be open.

**falai.js** — the Nano Banana 2 request formatter. Auto-routes between two endpoints based on what is in `_referenceImages`: if images are present it uses `/nano-banana-2/edit` and adds `image_urls` to the request body; otherwise it uses `/nano-banana-2` (text-to-image). Exports `parseResponse()` which returns all image URLs as an array, and `calculateCost(params)` for the resolution-based pricing table.

**Nano Banana 2 generation params on the NB2 Model node** — five combo widgets: Aspect Ratio (15 options including `auto`), Images (1–4), Output Format (png/jpeg/webp), Resolution (0.5K/1K/2K/4K), Safety (1–6, default 4). All pushed to `apiClient.js` via `setGenerationParams()` every tick. API Key is also a canvas widget on the node, pushed via `setApiKey()`. Changing Resolution or Images instantly updates the estimated cost.

**NB2 Model canvas stats** — three values drawn directly on the canvas at the bottom of the NB2 Model node: Spent / Est. / Req. Drawn by `onDrawForeground(ctx)` using canvas 2D drawing calls. `computeSize()` is overridden to add 36px of extra height so the stats row is never hidden behind the last widget.

**ContextControl.js** — currently disabled. The UI is not built. `getMode()` always returns `'open'`. All other functions (setAnchorImageUrl, resetContext) are preserved for re-enabling later without major changes.

**assembleImages()** — a function in `promptAssembler.js` that runs on every graph tick. Iterates all nodes connected to the Prompt Assembler, collects `{ data, label }` from each node's `images` array, and returns a flat array. The Prompt Assembler passes this to `apiClient.js` via `setReferenceImages()`.

**ImageModal.js** — a full-screen overlay shown after every successful generation. Shows all generated images in a flex-wrap grid, each with an "Open full size ↗" link and a ✕ close button. Created once, reused for every generation.

**apiClient.js module state** — `_apiKey`, `_format`, `_currentPrompt`, `_generationParams`, and `_referenceImages` are all stored as module-level variables. The NB2 Model node pushes the key and format every tick. The Prompt Assembler node pushes the prompt and images every tick. `generate()` reads from these variables directly — no DOM reads needed.

**LogPanel.js** — creates a fixed 80px bar at the bottom of the screen. Any module can call `log(message, type)` to add a line. Type is `'success'` (green), `'error'` (red), or `'info'` (grey). The bar shows the last 5 messages, newest at the top, each prefixed with a timestamp. The bar element is created lazily — it is built into the DOM the first time `log()` is called. `apiClient.js` calls `log()` at every meaningful event: sending a request, successful generation (including image count and cost), API errors, CORS errors, and blocked generations.

**Canvas height and the log bar** — the canvas is sized to `window.innerHeight - 80` (not the full window height) so the log bar never covers the bottom of the graph area. This adjustment is made in `canvas.js` both at startup and in the resize listener.

---

## What has not been built yet

- Save/load graph state
- Flux 2 Flex model node (second model node, same pattern as NB2ModelNode)
- GitHub publication (README, LICENSE, CONTRIBUTING.md)

---

## UI notes

- LiteGraph's own CSS (`node_modules/litegraph.js/css/litegraph.css`) must be loaded in `index.html` **before** our `styles.css` — without it the menus, search box, and dialogs are unstyled
- Node header colors are left to LiteGraph defaults — no custom `title_color` is set on any node
- The edit dialog label (`.graphdialog .name`) needs `color: white` in `styles.css` — LiteGraph sets a dark background but never sets a text color on the label, so it defaults to black
- Text editing is handled by the `PropertiesPanel` side panel, not by LiteGraph's built-in single-line dialog

---

## What comes next

The core generation chain is complete: prompt assembly → reference image collection → auto-routing (text-to-image or edit) → fal.ai API call → image modal display → cost tracking. The architecture now supports adding new model nodes independently of the prompt system.

Next planned steps:
- Add a Flux 2 Flex model node (same pattern as NB2ModelNode, different API endpoint and params)
- Save/load graph state to a JSON file
- Publish to GitHub as open source
