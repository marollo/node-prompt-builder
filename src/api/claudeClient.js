/**
 * Sends a reference image and a system prompt to the Claude API.
 * Returns Claude's text description of the image.
 * Used by the "Describe" button in the side panel to auto-fill a node's text field.
 */

// The Claude API endpoint for sending messages
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

// The Claude model used for image analysis — Haiku is fast and cheap for this task
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Reads the Claude API key from the side panel input field.
 * Returns an empty string if the field does not exist yet.
 */
function getClaudeApiKey() {
  return (document.getElementById('claude-api-key')?.value || '').trim()
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
    return 'Error: no Claude API key set. Add it in the API Settings panel.'
  }

  const { mediaType, data } = parseDataUrl(imageDataUrl)

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
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
    return 'Error: ' + (err?.error?.message || response.statusText)
  }

  const result = await response.json()

  // Claude returns an array of content blocks — we want the first text block
  return result?.content?.[0]?.text || 'Error: unexpected response format.'
}

export { describeImage }
