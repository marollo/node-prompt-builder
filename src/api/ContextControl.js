/**
 * Manages the generation context mode: Open or Closed.
 * Context Control UI is currently disabled — mode is always 'open'.
 * All functions are preserved so this can be re-enabled later without major changes.
 */

// ─── State ────────────────────────────────────────────────────────────────────

// Hardcoded to 'open' while Context Control is disabled
const _mode = 'open'

// The URL of the last successfully generated image — kept for future use
let _anchorImageUrl = null

// ─── Public functions ──────────────────────────────────────────────────────────

/**
 * Returns the current context mode.
 * Always returns 'open' while Context Control is disabled.
 */
function getMode() {
  return _mode
}

/**
 * Returns the stored anchor image URL, or null if none exists.
 * Kept for future use when Context Control is re-enabled.
 */
function getAnchorImageUrl() {
  return _anchorImageUrl
}

/**
 * Stores the URL of the last generated image.
 * Kept as a no-op display-wise while Context Control is disabled.
 */
function setAnchorImageUrl(url) {
  _anchorImageUrl = url
}

/**
 * Clears the stored anchor image.
 * Kept for future use when Context Control is re-enabled.
 */
function resetContext() {
  _anchorImageUrl = null
}

export { getMode, getAnchorImageUrl, setAnchorImageUrl, resetContext }
