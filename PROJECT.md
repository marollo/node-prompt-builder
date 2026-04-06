# MVP Brief: Node-Based Prompt Builder for Image Generation
### Complete specification for Claude Code

---

## Context

You are building a lightweight, browser-based node graph tool that helps users compose structured prompts for image generation APIs. Users place nodes on a canvas, connect them to an output node, and the tool assembles a final prompt string that is sent to a configurable image generation API endpoint. There is no backend. Everything runs client-side.

---

## Before Writing Any Code

Read the LiteGraph.js documentation at:
- https://github.com/jagenjo/litegraph.js/tree/master/guides
- https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md

Review source and examples at:
- https://github.com/jagenjo/litegraph.js

---

## Project Setup

- Scaffold with **Vite** and vanilla JavaScript, no framework
- Install LiteGraph.js via npm: `npm install litegraph.js`
- All styling in plain CSS using CSS variables, no external CSS libraries
- Single page app, no routing, no backend
- Target total bundle size under 500kb
- The canvas fills the full browser window
- API configuration, cost control, and the Generate button live in the Output node's side panel (not a bottom bar)

---

## Dark Theme CSS Variables

Define at root level and use throughout:

```css
:root {
  --bg: #1a1a1a;
  --node-bg: #2a2a2a;
  --node-text: #e0e0e0;
  --node-border: #3a3a3a;
  --panel-bg: #111111;
  --accent-teal: #2dd4bf;
  --accent-olive: #a3a800;
  --accent-blue: #3b82f6;
  --accent-amber: #f59e0b;
  --accent-purple: #a855f7;
  --accent-rose: #f43f5e;
  --accent-green: #22c55e;
}
```

---

## Node Types

### 1. Subject Node — header color: teal `#2dd4bf`

Describes what is in the image.

- Text area: subject description (placeholder: "a young woman in a leather jacket")
- Dropdown — Subject count: Single, Two, Group, Crowd
- Dropdown — Position in frame: Center, Rule of Thirds Left, Rule of Thirds Right, Foreground, Background, Full Frame
- Text area: extra subject details
- One output slot

Prompt contribution example:
`"a young woman in a leather jacket, single subject, rule of thirds left"`

---

### 2. Location / Set Node — header color: olive `#a3a800`

Describes the environment.

- Dropdown — Setting type: Interior, Exterior, Natural Landscape, Urban, Studio, Abstract / Void, Underwater, Space
- Text area: specific location description (placeholder: "crumbling gothic cathedral")
- Dropdown — Atmosphere: Clear, Foggy, Rainy, Snowy, Stormy, Dusty, Smoky, None
- Text area: extra environment details
- One output slot

Prompt contribution example:
`"urban exterior, neon-lit Tokyo alley, rainy atmosphere"`

---

### 3. Camera Preset Node — header color: blue `#3b82f6`

Controls the camera angle and lens.

- Dropdown — Angle: Eye Level, Low Angle, High Angle, Bird's Eye, Worm's Eye, Dutch Angle, Over the Shoulder, POV
- Dropdown — Focal length: Wide Angle, 35mm, 50mm, 85mm Portrait, Telephoto
- Text area: extra camera details (placeholder: "shallow depth of field, motion blur")
- One output slot

Prompt contribution example:
`"low angle shot, 85mm portrait lens, shallow depth of field"`

---

### 4. Lighting Preset Node — header color: amber `#f59e0b`

Controls the lighting setup.

- Dropdown — Lighting style: Natural Daylight, Golden Hour, Overcast, Rembrandt, Softbox, Hard Side Light, Rim Light, Neon Backlight, Candlelight, Studio White
- Dropdown — Time of day: Dawn, Morning, Midday, Afternoon, Dusk, Night, Not Applicable
- Text area: extra lighting details (placeholder: "warm tones, long shadows")
- One output slot

Prompt contribution example:
`"golden hour lighting, dusk, warm tones, long shadows"`

---

### 5. Style / Mood Node — header color: purple `#a855f7`

Controls the visual style and emotional tone.

- Dropdown — Visual style: Photorealistic, Cinematic, Analog Film, Illustration, Oil Painting, Watercolor, Comic Book, Concept Art, Dark Fantasy, Minimalist
- Dropdown — Mood: Dramatic, Peaceful, Tense, Melancholic, Euphoric, Mysterious, Gritty, Dreamy
- Text area: extra style details (placeholder: "high contrast, desaturated")
- One output slot

Prompt contribution example:
`"cinematic style, dramatic mood, high contrast, desaturated"`

---

### 6. Reference Image Node — REMOVED

> **Removed (March 2026):** This node is no longer part of the build. Reference images are already supported inside each content node (Subject, Camera, Lighting, etc.) via the side panel. A dedicated standalone node was deemed unnecessary — it would duplicate existing functionality without adding value. The `ReferenceImageNode.js` placeholder file remains but will not be built.

---

### 7. Output Node — header color: green `#22c55e`

The final assembly node.

- Accepts connections from all other node types into a single multi-input slot
- Assembles all prompt fragments from connected nodes in connection order, joined by commas
- Displays the assembled prompt in a read-only text area inside the node, updated live on any change
- A "Copy" button copies the prompt to clipboard
- A "Generate" button triggers the API call
- Displays the returned image inside the node or in a modal overlay

---

## Prompt Assembly Logic

Each node exposes a method `getPromptFragment()` that returns a string. The Output node calls this on all connected nodes and joins the results with `", "` to form the final prompt. The assembly updates reactively whenever any input in any connected node changes. Extra text areas in each node are appended after the dropdown-derived tokens for that node.

---

## Output Node Side Panel: API Configuration

> **Architecture change (March 2026):** API configuration, cost control, and the Generate button were moved from a fixed bottom bar into the Output node's side panel. Opening the Output node panel ("View Prompt") now shows three sections: the assembled prompt, API Settings, and Cost & Generate.

### API Settings (inside Output node side panel)

- Dropdown — Model:
  - **Nano Banana 2**: fal.ai text-to-image and image editing via `fal-ai/nano-banana-2`
  - **Generic REST**: `{ "prompt": "..." }` to any endpoint
- Text input: API Endpoint URL (optional override — Nano Banana 2 has a built-in default)
- Text input: API Key (type password)
- Status shown on the Generate button: "Generating…", "Error 422", "CORS error — see console"

### Auto-routing (Nano Banana 2)

The software automatically selects the correct endpoint:
- No reference images on any connected node → `/nano-banana-2` (text-to-image)
- Reference images present on any connected node → `/nano-banana-2/edit` (image editing, images sent as `image_urls`)

---

## Cost Control

A session cost management section in the bottom panel.

- **Budget limit input**: maximum spend per session in dollars, defaulting to $5.00. When the estimated or actual cumulative cost reaches this value, the Generate button is disabled and a warning is displayed with a "Reset session" button.
- **Estimated cost display**: calculates an approximate cost before generating based on selected resolution, steps, and API provider. Shown next to the Generate button as "Estimated: ~$0.04". Use hardcoded approximate per-request prices for known providers.
- **Actual cumulative cost**: reads cost or credit usage metadata from the API response where supported (Replicate and fal.ai return billing data in response metadata). Accumulate and display actual spend alongside the estimate.
- **Request counter**: shows how many generations have been triggered in the current session.
- **Cooldown timer**: configurable delay between generation requests, defaulting to 5 seconds. Show a countdown indicator when active. Prevents accidental rapid firing during iteration.
- **Video warning**: if a video generation endpoint is detected or selected, display a prominent warning that video requests cost significantly more than image requests, and suggest setting a lower budget limit.

---

## Context Control

A generation context section in the bottom panel that controls how much each new generation can vary from the previous one.

> **Status (March 2026):** Context Control UI is currently disabled. Mode is always Open (each generation is independent). The code is fully preserved and can be re-enabled without major changes when needed. The Open/Closed UI, anchor image thumbnail, and Reset context button are not shown.

### Modes (for future re-enabling)

**Open — Generate Variation** (currently active, hardcoded)
Each generation is fully independent. The prompt is used as-is.

**Closed — Delimit Variation** (disabled)
The last generated image URL is fed back into the next request via the `/edit` endpoint as `image_urls`. Will be re-enabled when the workflow requires iterative refinement.

---

## API Request Behavior

On Generate:

1. Check cooldown timer — if active, block and show countdown
2. Check budget limit — if reached, block and show warning
3. Collect the assembled prompt string from the Output node
4. Collect any base64 reference images from connected Reference Image nodes
5. If context mode is Closed, switch to the fal.ai edit endpoint and include the anchor image URL
6. Build the request body according to the selected format
7. Send a POST request to the configured endpoint with the API key in the Authorization header if provided
8. On success:
   - Display the returned image
   - Read cost metadata from the response if available and update cumulative cost
   - If context mode is Closed, store the returned image URL as the new anchor image
   - Increment the request counter
9. On failure, display the error message in the status area
10. Handle CORS errors explicitly with a user-friendly message explaining that the target API may need CORS enabled

---

## Build Order

Build and verify each step in the browser before moving to the next:

1. ✅ Vite project setup, LiteGraph.js installed, dark canvas rendering correctly
2. ✅ Output node skeleton with a read-only prompt text area
3. ✅ Subject node wired to Output node, prompt assembly working
4. ✅ Location / Set node
5. ✅ Camera Preset node
6. ✅ Lighting Preset node
7. ✅ Style / Mood node
8. ✅ API configuration and Generate logic — moved to Output node side panel (not bottom bar)
9. ~~Automatic1111 and ComfyUI request formats~~ — skipped (user does not use these tools)
10. ✅ Cost Control — budget, estimated cost, request counter, cooldown timer (in side panel)
11. ✅ Context Control — code built, UI disabled (mode always Open)
12. ~~Reference Image node~~ — removed, reference images live on each content node
13. ✅ Integration — reference images collected from nodes, auto-routed to NB2 text-to-image or edit endpoint
14. ✅ Polish — modal image display, button status messages, CORS detection, full-window canvas (no bottom bar)
15. ✅ Prompt structure — sentence-based format (period-separated sections, capitalised), reference image prefix follows multimodal prompting formula, old keyword-tag text removed
16. ✅ Node search — LiteGraph built-in nodes hidden from search list, only custom prompt nodes visible
17. ✅ Live prompt display — assembled prompt textarea in Output node side panel updates every graph tick without needing to close and reopen the panel
18. ✅ Named input slots — Output node has five fixed slots (Subject, Location, Camera, Lighting, Style) in Google framework order, replacing generic dynamic "fragment" slots
19. ✅ Node architecture split — Output node replaced by two separate nodes: PromptAssemblerNode (prompt assembly, View/Copy, output slot) and NB2ModelNode (generation params, API key, Generate, Cost Settings, live stats on canvas)
20. ✅ Log bar — fixed 80px strip at the bottom of the window showing timestamped API responses and errors; canvas height reduced by 80px so the bar never covers the graph
21. ✅ Ad format data — `formatRatio` added to all 79 formats in `image_ad_formats.json` using GCD algorithm; `image_ad_formats_nb2.json` created with 33 formats whose ratio exactly matches a NB2-supported aspect ratio
22. ✅ Ad Format node — optional pass-through node between Prompt Assembler and NB2 Model; "Select Formats" button opens checkbox panel grouped by platform; selected count drawn on canvas
23. ✅ Ad Format panel — checkbox UI loaded from `image_ad_formats_nb2.json`; formats grouped by platform cluster; each row shows name and ratio; select all / clear toggle per group
24. ✅ Batch generation — `generate()` in `apiClient.js` branches on `_selectedFormats`; `_generateBatch()` loops sequentially through selected formats, overrides aspect ratio per request, collects `{url, label}` results; ImageModal updated to show format name and dimensions under each image
25. ✅ Aspect Ratio widget lock — Aspect Ratio widget on NB2 Model node is automatically disabled when an Ad Format node is connected upstream with formats selected; re-enables when disconnected or formats cleared; implemented via `_isAspectRatioOverridden()` helper called on every tick
26. ✅ Batch cost estimate — Est. figure on NB2 Model node now shows total batch cost (base cost × format count); implemented via `_getFormatCount()` helper reading `selectedFormats.length` from the upstream Ad Format node
27. ✅ IndexedDB persistence — canvas state (nodes, connections, text, widget values, reference images, ad format selections) saved to IndexedDB every 2 seconds and restored on page reload; `storageUtils.js` wraps the IndexedDB API; `onSerialize`/`onConfigure` added to all content nodes and AdFormatNode
28. ✅ Recraft V4 Pro model node — second working model node; `recraftV4.js` formatter (flat $0.25/image, named `image_size`, boolean `enable_safety_checker`); `RecraftV4ModelNode.js` with Image Size + Safety widgets; reference image warning banner drawn on canvas when upstream nodes have images; dispatched in `apiClient.js` alongside NB2
29. ✅ New Project button — fixed top-right button clears canvas and wipes IndexedDB (`graph.clear()` + `saveGraph(null)`), then recreates default starter nodes; shifts left when side panel is open via `panel-open` CSS class toggled in `PropertiesPanel.js`
30. ✅ Claude image-to-text — "Describe" button on every image slot sends the image + a node-specific system prompt to Claude and fills the node's text field; system prompts stored in `src/prompts/*.md` (one per content node); `claudeClient.js` handles the API call; Claude API key field added to the API Settings panel

---

## Deployment

This is a fully static app with no backend. Deploy to Vercel by connecting the GitHub repository. Vercel detects Vite automatically and requires no configuration file. Push to the main branch to trigger automatic deployment.

For local Stable Diffusion or ComfyUI testing, run the app locally with `npm run dev` since a deployed static app cannot reach localhost APIs due to browser security restrictions. For cloud APIs like Replicate or fal.ai, the deployed Vercel URL works directly.

---

## Publishing to GitHub as Open Source

Steps to release this project publicly as an open-source tool built with Claude Code.

### 1. Security — do this first
- [ ] Confirm no API keys are hardcoded anywhere in the source files
- [ ] Add a `.gitignore` to exclude `node_modules/`, `.env`, `.DS_Store`
- [ ] Add a `.env.example` template showing variable names with empty values

### 2. Code cleanup
- [ ] Remove the old `/Users/mario/PRJT/Claude` folder at the repo root (leftover from old project)
- [ ] Confirm the git root is at the same level as `package.json`
- [ ] Run `npm run build` and confirm it completes with no errors

### 3. Files to write before going public
- [ ] `README.md` — what the tool is, a screenshot, how to run locally (`npm install` + `npm run dev`), how to get a fal.ai API key, link to Nano Banana 2 docs
- [ ] `LICENSE` — MIT license (most permissive, community-friendly)
- [ ] `CONTRIBUTING.md` — short guide for people who want to propose changes
- [ ] `.github/ISSUE_TEMPLATE/` — optional bug report and feature request templates

### 4. The "built with Claude Code" angle
- [ ] Add a credit section in `README.md` for Claude Code and Anthropic
- [ ] Add a short "How this was built" section — the no-professional-developer story is interesting to the community
- [ ] Add GitHub repository topics: `claude-code`, `ai`, `image-generation`, `litegraph`, `fal-ai`, `prompt-builder`, `vanilla-js`

### 5. GitHub repository setup
- [ ] Create a new public repository on GitHub
- [ ] Push the full git history (the commit log already tells the build story)
- [ ] Add a one-sentence description in the GitHub repo sidebar
- [ ] Add the fal.ai link and any relevant links in the sidebar

### 6. Optional but recommended
- [ ] Add a screenshot or short screen recording to the README — biggest factor in community engagement
- [ ] Deploy to Vercel for a live demo link in the README
- [ ] Add a `ROADMAP.md` listing planned features (Flux 2 Flex, etc.) so contributors know the direction

### Recommended order
1. Security check + `.gitignore`
2. `LICENSE` (MIT)
3. `README.md` with screenshot
4. Final `npm run build` check
5. Push to GitHub
6. Deploy to Vercel for live demo
7. Add topics and description on GitHub

---

## Hard Constraints

- No React, Vue, Angular or any component framework
- No backend
- No CDN dependencies — everything installed via npm
- LiteGraph.js via npm only
- Vanilla JS and plain CSS
- Vite for bundling
- Bundle under 500kb
- Must work in Firefox and Chrome without plugins
