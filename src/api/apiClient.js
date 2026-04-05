/**
 * Sends the assembled prompt to the configured API endpoint.
 * Holds the latest prompt, params, and reference images so the Generate button
 * always sends the current state of the graph.
 */

import { getSettings, getFormat } from './ApiPanel.js'
import { buildRequest as buildGenericRequest } from './genericRest.js'
import { buildRequest as buildFalaiRequest, parseResponse as parseFalaiResponse, calculateCost } from './formats/falai.js'
import { buildRequest as buildRecraftRequest, parseResponse as parseRecraftResponse, calculateCost as calculateRecraftCost } from './formats/recraftV4.js'
import { canGenerate, recordGeneration, updateEstimate, addSpent } from './CostControl.js'
import { getMode, getAnchorImageUrl, setAnchorImageUrl } from './ContextControl.js'
import { showImage } from '../panel/ImageModal.js'
import { log } from '../panel/LogPanel.js'

// ─── State stores ──────────────────────────────────────────────────────────────

// Latest assembled prompt text from the Output node
let _currentPrompt = ''

// Latest fal.ai generation parameters from the Output node widgets
let _generationParams = {}

// Latest reference images collected from all connected nodes
let _referenceImages = []

// API key entered on the model node canvas widget
let _apiKey = ''

// Which model/format is active — set by the model node on every tick
let _format = 'Nano Banana 2'

// Ad formats selected in the AdFormatNode panel — empty means single generation
let _selectedFormats = []

/**
 * Stores the latest assembled prompt.
 * Called by the Output node on every graph tick.
 */
function setPrompt(text) {
  _currentPrompt = text
}

/**
 * Stores the latest generation parameters (aspect ratio, resolution, etc.).
 * Called by the Output node on every graph tick.
 */
function setGenerationParams(params) {
  _generationParams = params

  // Update the estimated cost display live as params change
  const format = getFormat()
  updateEstimate(format === 'Nano Banana 2' ? calculateCost(params) : null)
}

/**
 * Stores the latest reference images collected from connected nodes.
 * Each entry is { data: 'base64...', label: 'subject reference' }.
 * Called by the Output node on every graph tick.
 */
function setReferenceImages(images) {
  _referenceImages = images
}

/**
 * Stores the API key from the model node canvas widget.
 * Called by the model node on every graph tick.
 */
function setApiKey(key) {
  _apiKey = key || ''
}

/**
 * Stores the list of ad formats selected in the AdFormatNode panel.
 * Empty array means no Ad Format node is active — single generation mode.
 * Called by AdFormatNode on every tick, and cleared when the node is removed.
 */
function setSelectedFormats(formats) {
  _selectedFormats = formats || []
}

/**
 * Stores the active model format so generate() knows which formatter to use.
 * Called by the model node on every graph tick.
 */
function setFormat(format) {
  _format = format || 'Nano Banana 2'
}

// ─── Button status helpers ────────────────────────────────────────────────────

/**
 * Sets the Generate button to an "in progress" state while the request is sent.
 */
function _setGenerating() {
  const btn = document.getElementById('api-generate-btn')
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Generating…'
  }
}

/**
 * Shows a temporary error message on the Generate button, then restores it.
 */
function _showButtonError(message) {
  const btn = document.getElementById('api-generate-btn')
  if (!btn) return
  btn.disabled = true
  btn.textContent = message
  setTimeout(() => {
    btn.disabled = false
    btn.textContent = 'Generate'
  }, 4000)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

/**
 * Entry point called by the Generate button on the NB2 Model node.
 * Branches into single generation or batch depending on whether ad formats
 * are selected in a connected AdFormatNode.
 */
async function generate() {
  if (!canGenerate()) {
    log('Generate blocked — budget reached or cooldown active', 'info')
    return
  }
  if (!_currentPrompt || _currentPrompt.startsWith('Connect nodes')) {
    _showButtonError('No prompt yet')
    log('No prompt yet — connect nodes to the Prompt Assembler', 'info')
    return
  }

  if (_selectedFormats.length > 0) {
    await _generateBatch()
  } else {
    await _generateSingle()
  }
}

/**
 * Sends a single request using the current params — the original behaviour.
 * Used when no Ad Format node is connected.
 */
async function _generateSingle() {
  _setGenerating()
  log('Sending request…', 'info')

  const settings = { url: '', apiKey: _apiKey }

  // Pick the right formatter based on which model node is active
  let requestData
  if (_format === 'Nano Banana 2') {
    requestData = buildFalaiRequest(_currentPrompt, settings, _generationParams, getMode(), getAnchorImageUrl(), _referenceImages)
  } else if (_format === 'Recraft V4') {
    requestData = buildRecraftRequest(_currentPrompt, settings, _generationParams)
  } else {
    requestData = buildGenericRequest(_currentPrompt, settings)
  }
  const { url, options } = requestData

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      _showButtonError(`Error ${response.status}`)
      log(`API error ${response.status}: ${response.statusText}`, 'error')
      return
    }
    const data = await response.json()
    if (_format === 'Nano Banana 2') {
      const imageUrls = parseFalaiResponse(data)
      if (imageUrls.length > 0) {
        showImage(imageUrls.map(url => ({ url, label: null })))
        setAnchorImageUrl(imageUrls[0])
      }
      const cost = calculateCost(_generationParams)
      addSpent(cost)
      log(`Generated ${imageUrls.length} image(s) — ~$${cost.toFixed(3)} this request`, 'success')
    } else if (_format === 'Recraft V4') {
      const imageUrls = parseRecraftResponse(data)
      if (imageUrls.length > 0) {
        showImage(imageUrls.map(url => ({ url, label: null })))
        setAnchorImageUrl(imageUrls[0])
      }
      const cost = calculateRecraftCost()
      addSpent(cost)
      log(`Generated ${imageUrls.length} image(s) — ~$${cost.toFixed(3)} this request`, 'success')
    }
    recordGeneration()
  } catch (err) {
    if (err instanceof TypeError) {
      _showButtonError('CORS error — see console')
      log('Request blocked — CORS error (the API server must allow this origin)', 'error')
    } else {
      _showButtonError('Request failed')
      log(`Request failed: ${err.message}`, 'error')
    }
  }
}

/**
 * Loops through the selected ad formats and sends one request per format.
 * Each request uses the format's exact aspect ratio, overriding the NB2 widget.
 * Results are collected and shown together in the modal with format labels.
 */
async function _generateBatch() {
  const total = _selectedFormats.length
  const results = []
  const btn = document.getElementById('api-generate-btn')

  for (let i = 0; i < _selectedFormats.length; i++) {
    const format = _selectedFormats[i]

    // Update button to show progress
    if (btn) { btn.disabled = true; btn.textContent = `${i + 1} / ${total}…` }
    log(`Generating ${i + 1}/${total} — ${format.name} (${format.formatRatio})`, 'info')

    // Override aspect ratio with this format's exact ratio
    const params = { ..._generationParams, aspectRatio: format.formatRatio }
    const settings = { url: '', apiKey: _apiKey }
    const { url, options } = buildFalaiRequest(
      _currentPrompt, settings, params, getMode(), getAnchorImageUrl(), _referenceImages
    )

    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        log(`Error on ${format.name}: ${response.status} ${response.statusText}`, 'error')
        continue
      }
      const data = await response.json()
      const imageUrls = parseFalaiResponse(data)
      if (imageUrls.length > 0) {
        // Label shows format name and pixel dimensions for easy identification
        results.push({ url: imageUrls[0], label: `${format.name} · ${format.width}×${format.height}` })
        setAnchorImageUrl(imageUrls[0])
      }
      const cost = calculateCost(params)
      addSpent(cost)
      recordGeneration()
      log(`✓ ${format.name} — ~$${cost.toFixed(3)}`, 'success')
    } catch (err) {
      log(`Failed: ${format.name} — ${err.message}`, 'error')
    }
  }

  // Show all collected results in the modal
  if (results.length > 0) showImage(results)

  // Restore the button
  if (btn) { btn.disabled = false; btn.textContent = 'Generate' }
  log(`Batch complete — ${results.length} of ${total} succeeded`, results.length === total ? 'success' : 'info')
}

export { setPrompt, setGenerationParams, setReferenceImages, setApiKey, setFormat, setSelectedFormats, generate }
