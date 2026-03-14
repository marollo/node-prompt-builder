# Node-Based Prompt Builder

A browser-based visual tool for composing structured image generation prompts. Place nodes on a canvas, connect them, and the tool assembles a final prompt that is sent to the fal.ai image generation API.

Built entirely with vanilla JavaScript — no framework, no backend. Everything runs in the browser.

---

## What it does

- **Node canvas** — drag and connect nodes visually to build your prompt
- **Five prompt nodes** — Subject, Location, Camera, Lighting, Style/Mood, each covering one layer of the image description
- **Google prompting framework** — the assembled prompt follows sentence structure (not keyword lists), which produces better results with modern image models
- **Reference images** — attach reference images directly to any node; the tool automatically switches between text-to-image and image editing mode
- **Nano Banana 2** — generates images via the fal.ai Nano Banana 2 API (Google's image generation model)
- **Cost control** — session budget limit, cooldown timer between requests, live cost estimate per generation

---

## Built with Claude Code

This project was built entirely through conversation with [Claude Code](https://claude.com/claude-code) — Anthropic's AI coding tool — by someone with no professional development background. Every file, every decision, and every bug fix was done collaboratively in plain English.

---

## How to run it locally

### 1. Get a fal.ai API key

- Create a free account at [fal.ai](https://fal.ai)
- Go to your dashboard and generate an API key
- Keep it — you will paste it into the app

### 2. Install and start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

### 3. Use it

1. Double-click the canvas to add nodes (Subject, Location, Camera, Lighting, Style/Mood)
2. Connect your nodes to the **Prompt Assembler** node
3. Connect the **Prompt Assembler** to the **NB2 Model** node
4. Enter your fal.ai API key in the API Key field on the NB2 Model node
5. Click **Generate**

---

## Project structure

```
src/
├── nodes/       — One file per node type
├── panel/       — Side panel, image modal, log bar
├── assembly/    — Prompt assembly logic
├── api/         — API client, cost control, request formatters
└── utils/       — Shared dropdown data
```

See `HOW_THIS_WORKS.md` for a full plain-English walkthrough of the codebase.

---

## Requirements

- Node.js v18 or newer
- A fal.ai account and API key
- Chrome or Firefox

---

## License

MIT — see `LICENSE`
