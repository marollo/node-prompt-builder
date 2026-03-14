/**
 * Shapes a prompt string and API settings into a fetch-ready request object.
 * Keeps all request formatting in one place so apiClient.js stays simple.
 */

/**
 * Builds and returns the URL and fetch options for a generic REST POST request.
 * Adds the Authorization header only when an API key was provided.
 */
function buildRequest(prompt, settings) {
  // Start with the required Content-Type header
  const headers = {
    'Content-Type': 'application/json',
  }

  // Only add Authorization if the user actually typed a key
  if (settings.apiKey) {
    headers['Authorization'] = 'Bearer ' + settings.apiKey
  }

  return {
    url: settings.url,
    options: {
      method: 'POST',
      headers,
      // The request body is JSON with a single "prompt" field
      body: JSON.stringify({ prompt }),
    },
  }
}

export { buildRequest }
