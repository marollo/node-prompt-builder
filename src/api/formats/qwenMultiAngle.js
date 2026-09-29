/**
 * Shapes a request for fal.ai's Qwen Image Edit 2511 Multiple Angles model and reads its reply.
 * The model re-draws an input image as if the camera had moved around the subject.
 * Source: docs/Qwen_Image_Edit_2511_Multiple_Angles.md
 */

// Synchronous endpoint — fal.ai holds the connection open until the image is ready
const QWEN_MULTI_ANGLE_URL = 'https://fal.run/fal-ai/qwen-image-edit-2511-multiple-angles'

// Price from the fal.ai docs: $0.035 for every megapixel (million pixels) of output
const PRICE_PER_MEGAPIXEL = 0.035

// ─── Request builder ──────────────────────────────────────────────────────────

/**
 * Builds the URL and fetch options for one generation.
 * `input` already uses the model's own field names (image_urls, horizontal_angle, …).
 */
function buildRequest(input, apiKey) {
  return {
    url: QWEN_MULTI_ANGLE_URL,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // fal.ai requires the "Key" prefix before the API key, not "Bearer"
        'Authorization': 'Key ' + apiKey,
      },
      body: JSON.stringify(input),
    },
  }
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Pulls the image URLs and the seed the model actually used out of fal.ai's reply.
 * Returns { urls: [], seed: null } when the reply is not in the expected shape.
 */
function parseResponse(data) {
  const urls = (data && Array.isArray(data.images)) ? data.images.map(img => img.url) : []
  const seed = (data && data.seed != null) ? data.seed : null
  return { urls, seed }
}

// ─── Cost calculator ──────────────────────────────────────────────────────────

/**
 * Works out the dollar cost from the size of the images that came back.
 * Each entry in `sizes` is { width, height } in pixels.
 */
function calculateCost(sizes) {
  const megapixels = sizes.reduce((sum, s) => sum + (s.width * s.height) / 1e6, 0)
  return megapixels * PRICE_PER_MEGAPIXEL
}

export { buildRequest, parseResponse, calculateCost }
