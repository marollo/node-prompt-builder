/**
 * Builds requests for Replicate's REST API and parses the responses.
 * Used by CameraMoveNode to call the qwen-edit-multiangle model.
 * Replicate uses an async prediction pattern — the Prefer: wait=N header
 * makes the call block until the result is ready (up to 60 seconds).
 */

// Use the Vite dev-server proxy path (/api/replicate) instead of the real
// Replicate URL. Vite rewrites this to https://api.replicate.com/v1 server-side,
// which avoids the CORS block the browser would get calling Replicate directly.
const REPLICATE_API_BASE = '/api/replicate'

/**
 * Builds the URL and fetch options for a Replicate model prediction.
 * modelPath is the "owner/model-name" slug from the Replicate URL.
 * inputParams is a plain object matching the model's input schema.
 */
function buildRequest(modelPath, inputParams, apiKey) {
  return {
    url: `${REPLICATE_API_BASE}/models/${modelPath}/predictions`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey,
        // Block until the prediction completes, up to 60 seconds
        'Prefer': 'wait=60'
      },
      body: JSON.stringify({ input: inputParams })
    }
  }
}

/**
 * Reads the first output URL from a completed Replicate prediction response.
 * Returns null if the prediction did not succeed or produced no output.
 */
function parseResponse(data) {
  if (data.status === 'succeeded' && Array.isArray(data.output) && data.output.length > 0) {
    return data.output[0]
  }
  return null
}

/**
 * Fetches an image from a URL and returns it as a base64 data URL.
 * Replicate outputs https:// image URLs — converting to base64 lets the result
 * travel through output sockets and be saved to IndexedDB like all other images.
 */
async function fetchImageAsBase64(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export { buildRequest, parseResponse, fetchImageAsBase64 }
