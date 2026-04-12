/**
 * Sends a reference image and a system prompt to the Claude API.
 * Returns Claude's text description of the image.
 * Used by the "Describe" button in the side panel to auto-fill a node's text field.
 */

import { log } from '../panel/LogPanel.js'
import { DEFAULT_MODEL, calculateClaudeCost } from '../utils/claudePricing.js'

// The Claude API endpoint for sending messages
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

/**
 * Reads the Claude API key from localStorage.
 * The key is saved there by the Settings modal whenever the user types it in.
 */
function getClaudeApiKey() {
  return (localStorage.getItem('claude-api-key') || '').trim()
}

/**
 * Reads the selected Claude model from localStorage.
 * Falls back to Haiku if the user has not opened Settings yet.
 */
function getClaudeModel() {
  return localStorage.getItem('claude-model') || DEFAULT_MODEL
}

/**
 * Splits a base64 data URL into its media type and raw base64 data.
 * Claude's API requires these two parts to be sent separately.
 * A data URL looks like: "data:image/jpeg;base64,/9j/4AAQ..."
 */
function parseDataUrl(dataUrl) {
  // The part before the comma is "data:image/jpeg;base64"
  // The part after is the raw base64 string
  const [meta, data] = dataUrl.split(',')

  // Extract just the mime type, e.g. "image/jpeg"
  const mediaType = meta.replace('data:', '').replace(';base64', '')

  return { mediaType, data }
}

/**
 * Sends one image and a system prompt to Claude and returns the description text.
 * Called when the user clicks "Describe" on an image slot in the side panel.
 *
 * @param {string} imageDataUrl  - The base64 data URL stored on the node (node.images[i].data)
 * @param {string} systemPrompt  - The contents of the node's .md prompt file
 * @returns {Promise<string>}    - Claude's text response, or an error message
 */
async function describeImage(imageDataUrl, systemPrompt) {
  const apiKey = getClaudeApiKey()

  if (!apiKey) {
    // Send the error to the log bar at the bottom — do not fill the node's text field
    log('No Claude API key set. Add it in the API Settings panel.', 'error')
    return null
  }

  const { mediaType, data } = parseDataUrl(imageDataUrl)

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
      // Required when calling the Claude API directly from a browser — without this the request is blocked by CORS
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model:      getClaudeModel(),
      max_tokens: 256,
      system:     systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            // Send the image as base64 — Claude's vision API requires this format
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data }
          },
          {
            // A short instruction in the user turn — the system prompt does the heavy lifting
            type: 'text',
            text: 'Describe this image.'
          }
        ]
      }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    log('Claude error: ' + (err?.error?.message || response.statusText), 'error')
    return null
  }

  const result = await response.json()

  // Claude returns an array of content blocks — we want the first text block
  const text = result?.content?.[0]?.text
  if (!text) {
    log('Claude returned an unexpected response format.', 'error')
    return null
  }

  // Calculate the exact cost from the token counts the API reported
  const model = getClaudeModel()
  const cost  = calculateClaudeCost(model, result.usage.input_tokens, result.usage.output_tokens)

  return { text, cost }
}

export { describeImage }
