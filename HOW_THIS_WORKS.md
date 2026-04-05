# How This Works

This document is a plain English map of the codebase. It is updated after every completed feature.

---

## What exists right now

- A dark LiteGraph canvas fills the full browser window
- Two nodes appear on the canvas at startup: **Prompt Assembler** and **NB2 Model**
- Nine node types are available by double-clicking the canvas: Subject, Location, Camera, Lighting, Style/Mood, Prompt Assembler, Ad Format, NB2 Model, Recraft V4 Pro — LiteGraph's built-in nodes are hidden
- Standard flow: content nodes → Prompt Assembler → NB2 Model (or Recraft V4 Pro) → API → image modal
- Batch flow: content nodes → Prompt Assembler → Ad Format → NB2 Model → API (one request per format) → labeled image modal

**Prompt Assembler node**
- Has five fixed input slots in Google framework order: Subject, Location, Camera, Lighting, Style
- Has one output slot that sends the assembled prompt string to the NB2 Model node
- "View Prompt" button opens the side panel showing the assembled prompt (updates live)
- "Copy Prompt" button copies to clipboard

**NB2 Model node**
- Has one input slot that receives the prompt string from the Prompt Assembler
- Canvas widgets: Aspect Ratio, Images, Output Format, Resolution, Safety, API Key
- The Aspect Ratio widget is automatically disabled (greyed out, unclickable) when an Ad Format node is connected upstream with at least one format selected — because the ratio is then controlled per-format during batch generation
- "Generate" button triggers image generation
- "Cost Settings" button opens the side panel with Budget and Cooldown inputs
- Bottom of the node shows three live stats drawn directly on the canvas: Spent / Est. / Req
- The Est. figure multiplies the base cost by the number of selected formats when an Ad Format node is connected — so the user sees the total expected spend for the whole batch before clicking Generate
- All generation state (API key, params, format) is pushed into `apiClient.js` on every tick

**Ad Format node** *(optional — insert between Prompt Assembler and NB2 Model for batch generation)*
- Has one input slot (Prompt) and one output slot (Prompt) — passes the prompt straight through
- "Select Formats" button opens the side panel showing 33 NB2-compatible ad formats grouped by platform
- Each format shows its name and exact aspect ratio (e.g. `9:16`, `4:5`)
- Ticking multiple formats enables batch mode — when Generate is clicked on NB2, one image is generated per selected format
- Selected count is drawn at the bottom of the node (green when formats are active)
- Clears its format list from `apiClient.js` when removed from the canvas

**Recraft V4 Pro node**
- Has one input slot that receives the prompt string from the Prompt Assembler
- Canvas widgets: Image Size (6 named options), Safety Checker (on/off), API Key
- "Generate" button triggers image generation via the `fal-ai/recraft/v4/pro/text-to-image` endpoint
- "Cost Settings" button opens the side panel with Budget and Cooldown inputs
- Flat pricing: always $0.25 per image — no resolution tiers
- If any upstream content node has a reference image uploaded, a yellow warning banner appears on the node: `⚠ Reference images ignored — text-to-image only`
- Batch generation (Ad Format node) is not supported — Recraft V4 does not accept an aspect ratio override
- Bottom of the node shows the same three live stats as NB2 Model: Spent / Est. / Req

**Canvas persistence**
- The entire canvas state is saved to IndexedDB automatically every 2 seconds
- On page reload, the saved state is restored — all nodes, positions, connections, text, widget values, reference images, and selected ad formats come back exactly as they were
- First run (nothing saved yet) shows the default empty canvas with one Prompt Assembler and one NB2 Model node

**Shared behaviour**
- The assembled prompt uses sentence structure: each node's contribution is a separate clause capitalised at the start, joined with `". "`
- When a node has reference images uploaded, its section opens with `"Using the provided [label], "` — following the multimodal prompting formula
- Each reference image has its own editable label below the thumbnail (defaults to the node's role)
- The software automatically picks text-to-image or image editing mode based on whether reference images exist
- When multiple images are generated the modal shows them all in a grid, each with an "Open full size" link
- In batch mode each image is labeled with the format name and pixel dimensions (e.g. "Story Image · 1080×1920")
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
│   │   ├── RecraftV4ModelNode.js     ← Receives prompt, sends it to Recraft V4 Pro; warns when reference images detected — BUILT
│   │   ├── AdFormatNode.js           ← Optional batch node — selects ad formats, triggers multi-format generation — BUILT
│   │   ├── SubjectNode.js            ← Describes the image subject — BUILT
│   │   ├── LocationNode.js           ← Describes the environment — BUILT
│   │   ├── CameraNode.js             ← Controls camera angle and lens — BUILT
│   │   ├── LightingNode.js           ← Controls lighting setup — BUILT
│   │   ├── StyleMoodNode.js          ← Controls visual style and mood — BUILT
│   │   └── ReferenceImageNode.js     ← Standalone reference image node — placeholder (not built)
│   ├── panel/
│   │   ├── PropertiesPanel.js        ← Side panel for editing node text fields and images — BUILT
│   │   ├── AdFormatPanel.js          ← Checkbox panel for selecting ad formats grouped by platform — BUILT
│   │   ├── ImageModal.js             ← Full-screen overlay showing generated images with optional labels — BUILT
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
│   │       ├── recraftV4.js          ← Recraft V4 Pro formatter — text-to-image only, flat $0.25/image — BUILT
│   │       ├── automatic1111.js      ← Automatic1111 request format — placeholder
│   │       └── comfyui.js            ← ComfyUI request format — placeholder
│   └── utils/
│       ├── nodeOptions.js            ← All dropdown data for all nodes — BUILT
│       ├── imageUtils.js             ← Image helpers — placeholder
│       └── storageUtils.js           ← IndexedDB save/load wrapper — BUILT
├── public/                           ← Static assets (empty for now)
└── docs/                             ← Plain English documentation per subsystem
```

---

## How the pieces connect

### Boot sequence
1. Browser loads `index.html`
2. `index.html` loads `styles.css` and `main.js`
3. `main.js` awaits `initCanvas()` from `canvas.js` (async because it reads IndexedDB)
4. `canvas.js` imports all node files — each import registers the node type with LiteGraph
5. `canvas.js` deletes all LiteGraph built-in node types, leaving only our `prompt/` nodes
6. `canvas.js` creates the `LGraph` (data) and `LGraphCanvas` (renderer)
7. `loadGraph()` from `storageUtils.js` checks IndexedDB for a saved state
8. If saved data exists: `graph.configure(saved)` restores all nodes, connections, and custom data
9. If no saved data: one Prompt Assembler node and one NB2 Model node are created as defaults
10. A `setInterval` starts auto-saving `graph.serialize()` to IndexedDB every 2 seconds
11. The graph starts its render and execution loop

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

### When the user clicks Generate (single mode — no Ad Format node)

1. The Generate button on the NB2 Model node (or its side panel) is clicked
2. `generate()` in `apiClient.js` checks budget/cooldown and prompt validity
3. `_selectedFormats` is empty — so `_generateSingle()` is called
4. The request is built using `_apiKey`, `_format`, `_generationParams`, and `_referenceImages`
5. `fetch()` sends the POST request; on success `showImage()` opens the modal with all returned images as `{url, label: null}` objects
6. Cost and request count are recorded

### When the user clicks Generate (batch mode — Ad Format node connected with formats selected)

1. The Generate button on the NB2 Model node is clicked
2. `generate()` checks budget/cooldown and prompt validity
3. `_selectedFormats` is non-empty — so `_generateBatch()` is called
4. The loop iterates through each selected format one at a time:
   - The button label updates to show progress: `1 / 5…`, `2 / 5…` etc.
   - The log bar shows `Generating N/total — Format Name (ratio)`
   - The request is built with `aspectRatio` overridden to the format's exact ratio
   - The response is collected as `{ url, label: "Format Name · W×H" }`
   - If one format fails, the loop continues with the next
5. After all formats are processed, `showImage(results)` opens the modal with all images labeled by format
6. The log bar shows a final summary: `Batch complete — N of total succeeded`

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

**NB2 Model canvas stats** — three values drawn directly on the canvas at the bottom of the NB2 Model node: Spent / Est. / Req. Drawn by `onDrawForeground(ctx)` using canvas 2D drawing calls. `computeSize()` is overridden to add 36px of extra height so the stats row is never hidden behind the last widget. The Est. value is `calculateCost(params) × formatCount` — where `formatCount` comes from `_getFormatCount()`, a helper that reads `selectedFormats.length` from the upstream Ad Format node (or returns 1 if none is connected).

**NB2ModelNode helpers** — two private methods added to `NB2ModelNode.prototype`:
- `_isAspectRatioOverridden()` — returns true when an Ad Format node is connected to the Prompt input and has at least one format selected. Sets `this._aspectRatio.disabled` accordingly on every tick.
- `_getFormatCount()` — returns `selectedFormats.length` from the upstream Ad Format node, or 1 if no Ad Format node is connected or no formats are selected. Used to multiply the cost estimate.

**storageUtils.js** — a Promise-based wrapper around the browser's IndexedDB API. Exports `saveGraph(data)` and `loadGraph()`. Internally opens (or creates) a database called `node-prompt-builder` with a single object store called `graph`. The entire serialized graph is stored under the key `canvas`. Every call to `openDB()` returns a fresh connection — no persistent connection is kept.

**IndexedDB persistence** — unlike `localStorage`, IndexedDB has no practical size limit and handles large JSON objects (including base64 reference images) without issues. The graph is saved as the plain object returned by `graph.serialize()`, which LiteGraph can restore in full with `graph.configure()`.

**`onSerialize` / `onConfigure`** — two LiteGraph hooks that every content node implements. `onSerialize(info)` adds our custom data (`this.values`, `this.images`, `this.selectedFormats`) to the object LiteGraph is about to save. `onConfigure(info)` reads it back when restoring. Without these hooks, custom data would be lost on reload because LiteGraph only saves widget values and positions by default.

**recraftV4.js** — the Recraft V4 Pro request formatter. Always uses the single endpoint `fal-ai/recraft/v4/pro/text-to-image`. Accepts `image_size` (a named string like `"square_hd"`) and `enable_safety_checker` (a boolean). Exports `calculateCost()` with no parameters — always returns `0.25`. No edit endpoint exists for this model.

**RecraftV4ModelNode.js** — model node for Recraft V4 Pro. Same structure as NB2ModelNode but with two widgets instead of five: Image Size (6 named options) and Safety Checker (on/off). Adds `_collectReferenceImages()` — a helper that walks upstream through the Prompt Assembler to check whether any connected content node has images in its `node.images` array. If images are found, a yellow warning banner is drawn on the node via `onDrawForeground()`. `computeSize()` adds 56px extra height when the warning is visible (vs. 36px normally) so the banner never overlaps the widgets.

**ContextControl.js** — currently disabled. The UI is not built. `getMode()` always returns `'open'`. All other functions (setAnchorImageUrl, resetContext) are preserved for re-enabling later without major changes.

**assembleImages()** — a function in `promptAssembler.js` that runs on every graph tick. Iterates all nodes connected to the Prompt Assembler, collects `{ data, label }` from each node's `images` array, and returns a flat array. The Prompt Assembler passes this to `apiClient.js` via `setReferenceImages()`.

**ImageModal.js** — a full-screen overlay shown after every successful generation. Accepts an array of `{url, label}` objects. In single mode `label` is `null` and nothing extra is shown. In batch mode `label` is `"Format Name · W×H"` and appears between the thumbnail and the "Open full size" link.

**apiClient.js module state** — `_apiKey`, `_format`, `_currentPrompt`, `_generationParams`, `_referenceImages`, and `_selectedFormats` are all stored as module-level variables. `generate()` branches on `_selectedFormats.length`: zero means single generation (`_generateSingle`), non-zero means batch (`_generateBatch`).

**AdFormatNode.js** — optional pass-through node. Receives the prompt, passes it downstream unchanged, and pushes its `selectedFormats` array to `apiClient` via `setSelectedFormats()` on every tick. Uses `onRemoved()` to clear the format list when deleted from the canvas.

**AdFormatPanel.js** — checkbox UI loaded from `Data/image_ad_formats_nb2.json`. Groups formats by platform cluster. Each row shows the format name and `formatRatio`. "Select all / Clear" toggle per group. Footer shows total selected count. Selections are stored directly on `node.selectedFormats`.

**Data/image_ad_formats_nb2.json** — 33 ad formats whose `formatRatio` exactly matches one of NB2's 14 supported aspect ratios. Filtered from `image_ad_formats.json` (79 formats total). `formatRatio` was calculated algorithmically using the GCD of width and height.

**LogPanel.js** — creates a fixed 80px bar at the bottom of the screen. Any module can call `log(message, type)` to add a line. Type is `'success'` (green), `'error'` (red), or `'info'` (grey). The bar shows the last 5 messages, newest at the top, each prefixed with a timestamp. The bar element is created lazily — it is built into the DOM the first time `log()` is called. `apiClient.js` calls `log()` at every meaningful event: sending a request, successful generation (including image count and cost), API errors, CORS errors, and blocked generations.

**Canvas height and the log bar** — the canvas is sized to `window.innerHeight - 80` (not the full window height) so the log bar never covers the bottom of the graph area. This adjustment is made in `canvas.js` both at startup and in the resize listener.

---

## What has not been built yet

- Save/load graph state to a JSON file
- Flux 2 Flex model node (third model node, same pattern as NB2ModelNode and RecraftV4ModelNode)

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
- Add a Flux 2 Flex model node (same pattern as NB2ModelNode and RecraftV4ModelNode, different API endpoint and params)
- Save/load graph state to a JSON file
