/**
 * Manages session cost controls: budget limit, request counter, and cooldown timer.
 * State lives in module variables so it survives the side panel being opened and closed.
 * Call initCostUI(container) to build the HTML into the Output node side panel.
 */

// ─── Session state ─────────────────────────────────────────────────────────────

// How much has been spent this session
let _spent = 0.00

// How many generations have been triggered this session
let _requestCount = 0

// Budget and cooldown stored here so they survive panel close/reopen
let _budget = 5.00
let _cooldownSeconds = 5

// Last calculated estimate — stored so the model node can read it for canvas display
let _lastEstimate = 0

// Whether the cooldown timer is currently running
let _cooldownActive = false

// The setInterval handle so we can clear it if needed
let _cooldownInterval = null

// ─── DOM helper ────────────────────────────────────────────────────────────────

/**
 * Safely finds the Generate button in the side panel.
 * Returns null if the panel is currently closed — all callers check for null.
 */
function _getBtn() {
  return document.getElementById('api-generate-btn')
}

// ─── UI builder ───────────────────────────────────────────────────────────────

/**
 * Builds the cost control section HTML into the given container element.
 * Called by PropertiesPanel each time the Output node side panel is opened.
 * Populates inputs from the stored module state so values are not lost on reopen.
 */
function initCostUI(container) {
  container.innerHTML = `
    <div class="panel-section-title">Cost &amp; Generate</div>

    <div class="cost-row">
      <label class="panel-field-label">
        Budget $
        <input id="cost-budget" type="number" class="panel-input panel-input--short"
               value="${_budget.toFixed(2)}" min="0" step="0.50" />
      </label>
      <label class="panel-field-label">
        Cooldown (s)
        <input id="cost-cooldown" type="number" class="panel-input panel-input--short"
               value="${_cooldownSeconds}" min="0" max="60" />
      </label>
      <button id="cost-reset-btn" class="panel-btn panel-btn--secondary">Reset session</button>
    </div>

    <div class="cost-row cost-stats">
      <span class="cost-stat">Spent: <strong id="cost-spent">$${_spent.toFixed(2)}</strong></span>
      <span class="cost-stat">Est: <strong id="cost-estimate">—</strong></span>
      <span class="cost-stat">Requests: <strong id="cost-count">${_requestCount}</strong></span>
    </div>

    <button id="api-generate-btn" class="panel-generate-btn">Generate</button>
  `

  // Keep module variables in sync when the user changes the inputs
  document.getElementById('cost-budget').addEventListener('input', e => {
    _budget = parseFloat(e.target.value) || 0
  })
  document.getElementById('cost-cooldown').addEventListener('input', e => {
    _cooldownSeconds = parseInt(e.target.value) || 0
  })

  // Wire the reset button
  document.getElementById('cost-reset-btn').addEventListener('click', resetSession)

  // If a cooldown is currently active, immediately show the remaining state on the button
  if (_cooldownActive) {
    const btn = _getBtn()
    btn.disabled = true
    btn.textContent = 'Wait…'
  } else if (_budget > 0 && _spent >= _budget) {
    const btn = _getBtn()
    btn.disabled = true
    btn.textContent = 'Budget reached'
  }
}

// ─── Public functions ──────────────────────────────────────────────────────────

/**
 * Returns true if a generation is allowed right now.
 * Blocks if the cooldown timer is active or the budget has been reached.
 */
function canGenerate() {
  if (_cooldownActive) return false
  if (_budget > 0 && _spent >= _budget) return false
  return true
}

/**
 * Called after a successful generation.
 * Increments the request counter and starts the cooldown timer.
 */
function recordGeneration() {
  _requestCount++
  const countEl = document.getElementById('cost-count')
  if (countEl) countEl.textContent = _requestCount
  _startCooldown()
}

/**
 * Resets the session — zeroes counter and spent amount, re-enables Generate.
 */
function resetSession() {
  _requestCount = 0
  _spent = 0.00

  const countEl = document.getElementById('cost-count')
  const spentEl = document.getElementById('cost-spent')
  const estEl   = document.getElementById('cost-estimate')
  if (countEl) countEl.textContent = '0'
  if (spentEl) spentEl.textContent = '$0.00'
  if (estEl)   estEl.textContent   = '—'

  const btn = _getBtn()
  if (btn && !_cooldownActive) {
    btn.disabled = false
    btn.textContent = 'Generate'
  }
}

/**
 * Updates the estimated cost display before a generation is sent.
 * Called by apiClient.js whenever generation params change.
 * Pass null to show "—" when the model has no cost estimate.
 */
function updateEstimate(cost) {
  _lastEstimate = cost || 0
  const el = document.getElementById('cost-estimate')
  if (el) el.textContent = cost !== null ? `~$${cost.toFixed(2)}` : '—'
}

/**
 * Returns the current session stats so the model node can display them on the canvas.
 */
function getStats() {
  return { spent: _spent, estimate: _lastEstimate, requestCount: _requestCount }
}

/**
 * Adds the cost of a completed generation to the cumulative spend total.
 * Disables Generate if the budget is now reached.
 */
function addSpent(amount) {
  _spent = parseFloat((_spent + amount).toFixed(4))

  const spentEl = document.getElementById('cost-spent')
  if (spentEl) spentEl.textContent = `$${_spent.toFixed(2)}`

  if (_budget > 0 && _spent >= _budget) {
    const btn = _getBtn()
    if (btn) {
      btn.disabled = true
      btn.textContent = 'Budget reached'
    }
  }
}

// ─── Internal ──────────────────────────────────────────────────────────────────

/**
 * Starts the cooldown countdown on the Generate button.
 * Uses the stored _cooldownSeconds value set when the user last changed the input.
 */
function _startCooldown() {
  if (_cooldownSeconds <= 0) {
    // No cooldown — restore the button immediately
    const btn = _getBtn()
    if (btn) {
      if (_budget > 0 && _spent >= _budget) {
        btn.disabled = true
        btn.textContent = 'Budget reached'
      } else {
        btn.disabled = false
        btn.textContent = 'Generate'
      }
    }
    return
  }

  _cooldownActive = true
  let remaining = _cooldownSeconds

  const tick = () => {
    // Re-fetch the button on every tick in case the panel was reopened
    const btn = _getBtn()
    if (btn) {
      btn.disabled = true
      btn.textContent = `Wait ${remaining}s…`
    }

    remaining--

    if (remaining < 0) {
      clearInterval(_cooldownInterval)
      _cooldownActive = false

      const btn = _getBtn()
      if (btn) {
        if (_budget > 0 && _spent >= _budget) {
          btn.disabled = true
          btn.textContent = 'Budget reached'
        } else {
          btn.disabled = false
          btn.textContent = 'Generate'
        }
      }
    }
  }

  tick() // run immediately so the button updates without a 1s delay
  _cooldownInterval = setInterval(tick, 1000)
}

export { initCostUI, canGenerate, recordGeneration, resetSession, updateEstimate, addSpent, getStats }
