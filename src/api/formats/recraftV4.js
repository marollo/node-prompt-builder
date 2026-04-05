/**
 * Shapes a prompt and generation parameters into a Recraft V4 Pro request.
 * Recraft V4 Pro is a flat-rate model: $0.25 per image, no resolution tiers.
 */

// Text-to-image endpoint from the Recraft V4 Pro API docs
const RECRAFT_URL = 'https://fal.run/fal-ai/recraft/v4/pro/text-to-image'

// Fixed price — Recraft V4 Pro charges a flat $0.25 per image regardless of size
const PRICE_PER_IMAGE = 0.25

// ─── Request builder ──────────────────────────────────────────────────────────

/**
 * Builds and returns the URL and fetch options for a Recraft V4 Pro POST request.
 * Uses the same fal.ai authorization header format as the NB2 formatter.
 */
function buildRequest(prompt, settings, params) {
  const headers = {
    'Content-Type': 'application/json',
  }

  // fal.ai requires "Key" prefix before the API key, not "Bearer"
  if (settings.apiKey) {
    headers['Authorization'] = 'Key ' + settings.apiKey
  }

  const body = {
    prompt,
    // image_size uses named strings like "square_hd" instead of numeric ratios
    image_size: params.imageSize || 'square_hd',
    // enable_safety_checker is a boolean — the node stores "on"/"off" strings
    enable_safety_checker: params.safety !== 'off',
  }

  return {
    url: settings.url || RECRAFT_URL,
    options: {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  }
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Reads all generated image URLs from a Recraft V4 Pro response object.
 * Returns an array of URL strings.
 * Returns an empty array if the expected shape is not found.
 */
function parseResponse(data) {
  if (data && data.images && data.images.length > 0) {
    return data.images.map(img => img.url)
  }
  return []
}

// ─── Cost calculator ──────────────────────────────────────────────────────────

/**
 * Returns the cost of one Recraft V4 Pro generation.
 * Always $0.25 — there are no resolution tiers or multi-image options on this model.
 */
function calculateCost() {
  return PRICE_PER_IMAGE
}

export { buildRequest, parseResponse, calculateCost }
