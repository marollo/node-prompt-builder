/**
 * Shapes a prompt and generation parameters into a fal.ai Nano Banana 2 request.
 * Automatically picks text-to-image or image editing based on whether
 * reference images are present on connected nodes.
 */

// Text-to-image endpoint
const FALAI_BASE_URL = 'https://fal.run/fal-ai/nano-banana-2'

// Image editing endpoint — used automatically when reference images exist
const FALAI_EDIT_URL = 'https://fal.run/fal-ai/nano-banana-2/edit'

// ─── Pricing table ────────────────────────────────────────────────────────────
// Source: fal.ai Nano Banana 2 docs — price per image at each resolution
const PRICE_PER_IMAGE = {
  '0.5K': 0.06,
  '1K':   0.08,
  '2K':   0.12,
  '4K':   0.16,
}

// ─── Request builder ──────────────────────────────────────────────────────────

/**
 * Builds and returns the URL and fetch options for a fal.ai POST request.
 * Automatically switches to the edit endpoint when reference images are present.
 * referenceImages is an array of { data, label } objects from connected nodes.
 */
function buildRequest(prompt, settings, params, contextMode, anchorImageUrl, referenceImages) {
  const headers = {
    'Content-Type': 'application/json',
  }

  // fal.ai requires "Key" prefix, not "Bearer"
  if (settings.apiKey) {
    headers['Authorization'] = 'Key ' + settings.apiKey
  }

  // Collect all image URLs/data to send:
  // reference images from nodes + anchor image from context (if any)
  const imageList = []

  if (referenceImages && referenceImages.length > 0) {
    // Log what we are sending so the user can see it in the browser console
    console.log(`[falai] Sending ${referenceImages.length} reference image(s):`)
    referenceImages.forEach(img => console.log(`  · ${img.label}`))

    // Add each reference image's base64 data as an entry in image_urls
    // Note: fal.ai docs show https:// URLs — base64 data URIs may or may not be accepted
    referenceImages.forEach(img => imageList.push(img.data))
  }

  // If context mode is closed and there is an anchor image, add it too
  if (contextMode === 'closed' && anchorImageUrl) {
    imageList.push(anchorImageUrl)
  }

  // Use the edit endpoint if we have any images to send, otherwise text-to-image
  const useEditEndpoint = imageList.length > 0
  const url = settings.url || (useEditEndpoint ? FALAI_EDIT_URL : FALAI_BASE_URL)

  const body = {
    prompt,
    aspect_ratio:     params.aspectRatio  || 'auto',
    num_images:       params.numImages    || 1,
    output_format:    params.outputFormat || 'png',
    resolution:       params.resolution   || '1K',
    // Safety tolerance: fal.ai expects a string, API default is "4"
    safety_tolerance: String(params.safety || '4'),
  }

  // Add image_urls to the body when using the edit endpoint
  if (useEditEndpoint) {
    body.image_urls = imageList
  }

  return {
    url,
    options: {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  }
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Reads all generated image URLs from a fal.ai response object.
 * Returns an array of URL strings — one per generated image.
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
 * Calculates the exact cost of a generation based on resolution and image count.
 * Uses fixed prices from the Nano Banana 2 pricing docs.
 * Returns a dollar amount as a number (e.g. 0.08).
 */
function calculateCost(params) {
  const pricePerImage = PRICE_PER_IMAGE[params.resolution] || PRICE_PER_IMAGE['1K']
  return pricePerImage * (params.numImages || 1)
}

export { buildRequest, parseResponse, calculateCost }
