/**
 * Exposes getter functions for the API settings inputs.
 * The HTML for these inputs is now built by PropertiesPanel when the Output node
 * side panel is opened — this file only reads from those inputs by element ID.
 */

/**
 * Reads the current URL and API key values from the side panel inputs.
 * Called by apiClient.js before every generation request.
 */
function getSettings() {
  return {
    url:    (document.getElementById('api-url')?.value  || '').trim(),
    apiKey: (document.getElementById('api-key')?.value  || '').trim(),
  }
}

/**
 * Returns the currently selected model name from the side panel dropdown.
 * Called by apiClient.js to decide which formatter to use.
 */
function getFormat() {
  return document.getElementById('api-format')?.value || 'Nano Banana 2'
}

export { getSettings, getFormat }
