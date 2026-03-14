/**
 * Sends the assembled prompt to the configured API endpoint.
 * Holds the latest prompt, params, and reference images so the Generate button
 * always sends the current state of the graph.
 */

import { getSettings, getFormat } from './ApiPanel.js'
import { buildRequest as buildGenericRequest } from './genericRest.js'
import { buildRequest as buildFalaiRequest, parseResponse as parseFalaiResponse, calculateCost } from './formats/falai.js'
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
 * Reads panel settings, validates them, then sends the prompt to the API.
 * Called by the Generate button in the Output node side panel.
 */
async function generate() {
  // Stop early if budget is reached or cooldown is active
  if (!canGenerate()) {
    log('Generate blocked — budget reached or cooldown active', 'info')
    console.warn('Generate: blocked by cost control (budget or cooldown).')
    return
  }

  // Stop early if the prompt is empty or still the placeholder
  if (!_currentPrompt || _currentPrompt.startsWith('Connect nodes')) {
    _showButtonError('No prompt yet')
    log('No prompt yet — connect nodes to the Prompt Assembler', 'info')
    return
  }

  // Show "Generating…" on the button while the request is in flight
  _setGenerating()
  log('Sending request…', 'info')

  // Build the request using the stored API key and format
  const settings = { url: '', apiKey: _apiKey }
  const { url, options } = _format === 'Nano Banana 2'
    ? buildFalaiRequest(_currentPrompt, settings, _generationParams, getMode(), getAnchorImageUrl(), _referenceImages)
    : buildGenericRequest(_currentPrompt, settings)

  try {
    console.log('Sending request to', url)
    const response = await fetch(url, options)

    if (!response.ok) {
      _showButtonError(`Error ${response.status}`)
      log(`API error ${response.status}: ${response.statusText}`, 'error')
      console.error('API error:', response.status, response.statusText)
      return
    }

    const data = await response.json()
    console.log('API response:', data)

    // For Nano Banana 2: show all generated images, store first as anchor, record cost
    if (_format === 'Nano Banana 2') {
      const imageUrls = parseFalaiResponse(data)
      if (imageUrls.length > 0) {
        showImage(imageUrls)
        // Store the first image as the anchor for context control
        setAnchorImageUrl(imageUrls[0])
      }
      const cost = calculateCost(_generationParams)
      addSpent(cost)
      log(`Generated ${imageUrls.length} image(s) — ~$${cost.toFixed(3)} this request`, 'success')
    }

    // Count this as a successful generation and start the cooldown
    recordGeneration()

  } catch (err) {
    // TypeError means the browser blocked the request — usually a CORS issue
    if (err instanceof TypeError) {
      _showButtonError('CORS error — see console')
      log('Request blocked — CORS error (the API server must allow this origin)', 'error')
      console.error(
        'Request blocked — likely a CORS issue.\n' +
        'The API server at', url, 'must allow requests from this origin.'
      )
    } else {
      _showButtonError('Request failed')
      log(`Request failed: ${err.message}`, 'error')
      console.error('Request failed:', err.message)
    }
  }
}

export { setPrompt, setGenerationParams, setReferenceImages, setApiKey, setFormat, generate }
