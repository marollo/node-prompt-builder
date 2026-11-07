/**
 * Defines the Total spent badge in the top bar (backlog #12).
 * Shows the all-time cost of every model used, saved across page reloads; clicking it
 * opens a small breakdown per model with a Reset button.
 * The numbers come from CostControl.js — this file only draws them.
 */

import { getTotals, resetTotals, onTotalsChange } from '../api/CostControl.js'

// The badge button and the breakdown box under it — created once by initTotalBadge()
let _badgeEl = null
let _boxEl = null

/**
 * Creates the badge and its breakdown box, puts them in the top bar, and keeps them up to date.
 * Called once by canvas.js at startup, next to the Settings and Gallery buttons.
 */
function initTotalBadge() {
  _badgeEl = document.createElement('button')
  _badgeEl.id = 'total-spent-btn'
  _badgeEl.addEventListener('click', _toggleBox)
  document.body.appendChild(_badgeEl)

  _boxEl = document.createElement('div')
  _boxEl.id = 'total-spent-box'
  document.body.appendChild(_boxEl)

  // Redraw whenever any model adds a cost, so the badge is always current
  onTotalsChange(_refresh)
  _refresh()
}

/**
 * Adds up all models' totals into one number.
 * Used by the badge and by the last line of the breakdown.
 */
function _sum(totals) {
  return Object.values(totals).reduce((a, b) => a + b, 0)
}

/**
 * Formats dollars for display: 2 decimals normally, 4 for amounts under one cent.
 * Claude calls cost fractions of a cent, and "$0.00" would wrongly look free.
 */
function _money(amount) {
  return '$' + amount.toFixed(amount > 0 && amount < 0.01 ? 4 : 2)
}

/**
 * Redraws the badge text and, if it is open, the breakdown list.
 * Called at startup, after every new cost, and after a reset.
 */
function _refresh() {
  const totals = getTotals()
  _badgeEl.textContent = `Total: ${_money(_sum(totals))}`
  if (_boxEl.style.display === 'block') _renderBox(totals)
}

/**
 * Opens or closes the breakdown box under the badge.
 */
function _toggleBox() {
  const open = _boxEl.style.display === 'block'
  _boxEl.style.display = open ? 'none' : 'block'
  if (!open) _renderBox(getTotals())
}

/**
 * Fills the breakdown box: one line per model (largest first), the total, and a Reset button.
 * Reset needs two clicks — the first changes the label to ask for confirmation — so it can't happen by accident.
 */
function _renderBox(totals) {
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1])
  _boxEl.innerHTML = ''

  // One line per model; the model names come from our own code, but textContent keeps them as plain text anyway
  if (rows.length === 0) _addLine('Nothing spent yet', '')
  rows.forEach(([model, amount]) => _addLine(model, _money(amount)))
  _addLine('Total', _money(_sum(totals)), 'total-spent-sum')

  const reset = document.createElement('button')
  reset.id = 'total-spent-reset'
  reset.textContent = 'Reset total'
  reset.addEventListener('click', () => {
    // First click asks; second click (while it says "Click again") clears the total
    if (reset.dataset.armed) return resetTotals()
    reset.dataset.armed = 'yes'
    reset.textContent = 'Click again to reset'
  })
  _boxEl.appendChild(reset)
}

/**
 * Adds one "name ……… amount" line to the breakdown box.
 * extraClass styles the final Total line differently.
 */
function _addLine(label, value, extraClass) {
  const line = document.createElement('div')
  line.className = 'total-spent-line' + (extraClass ? ' ' + extraClass : '')
  const name = document.createElement('span')
  name.textContent = label
  const amount = document.createElement('span')
  amount.textContent = value
  line.append(name, amount)
  _boxEl.appendChild(line)
}

export { initTotalBadge }
