/**
 * Creates a fixed bar at the bottom of the screen that shows API responses
 * and application errors as they happen.
 * Exposes a single log(message, type) function that every other module can call.
 */

// Maximum number of log lines visible at once — oldest are removed when exceeded
const MAX_ENTRIES = 5

// The bar element — created once on the first log() call, then reused
let _barEl = null

/**
 * Builds the log bar DOM element and appends it to the page body.
 * Called automatically the first time log() is invoked.
 */
function buildBar() {
  const bar = document.createElement('div')
  bar.id = 'log-bar'
  document.body.appendChild(bar)
  return bar
}

/**
 * Adds a message to the log bar.
 * type controls the colour: 'success' = green, 'error' = red, 'info' = grey.
 * The newest message always appears at the top.
 * Once MAX_ENTRIES is reached, the oldest line is removed.
 */
function log(message, type = 'info') {
  if (!_barEl) _barEl = buildBar()

  // Build a short timestamp string — HH:MM:SS
  const time = new Date().toTimeString().slice(0, 8)

  const entry = document.createElement('div')
  entry.className = `log-entry log-entry--${type}`
  entry.textContent = `[${time}]  ${message}`

  // Insert at top so the newest line is always first
  _barEl.insertBefore(entry, _barEl.firstChild)

  // Drop the oldest line once the limit is exceeded
  while (_barEl.children.length > MAX_ENTRIES) {
    _barEl.removeChild(_barEl.lastChild)
  }
}

export { log }
