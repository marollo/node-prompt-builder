/**
 * Side panel for the Ad Format node.
 * Shows ad formats grouped by platform as checkboxes.
 * The user ticks which formats they want — AdFormatNode stores the selection
 * and passes it to apiClient so NB2 can run one generation per format.
 */

import formatsData from '../../Data/image_ad_formats_nb2.json'

// The shared panel element — same div used by PropertiesPanel
let _panelEl = null

// The node currently shown — used to sync checkboxes back to node.selectedFormats
let _currentNode = null

/**
 * Returns the shared panel element, creating it the first time if needed.
 * Reuses the same #properties-panel div as PropertiesPanel so the UI is consistent.
 */
function getPanel() {
  if (_panelEl) return _panelEl
  _panelEl = document.getElementById('properties-panel')
  if (!_panelEl) {
    _panelEl = document.createElement('div')
    _panelEl.id = 'properties-panel'
    document.body.appendChild(_panelEl)
  }
  return _panelEl
}

/**
 * Opens the Ad Format selection panel for the given node.
 * Clears the panel and rebuilds the checkbox list from the NB2-compatible formats.
 */
function openPanel(node) {
  _currentNode = node
  const panel = getPanel()

  // Show the panel
  panel.style.display = 'flex'
  panel.innerHTML = ''

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.id = 'properties-panel-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => { panel.style.display = 'none' })
  panel.appendChild(closeBtn)

  // Title
  const title = document.createElement('div')
  title.id = 'properties-panel-title'
  title.textContent = 'Select Ad Formats'
  panel.appendChild(title)

  // Scrollable content area
  const content = document.createElement('div')
  content.id = 'properties-panel-content'
  panel.appendChild(content)

  // Footer showing how many formats are selected
  const footer = document.createElement('div')
  footer.className = 'adformat-footer'
  panel.appendChild(footer)

  // Build one group per platform cluster
  for (const cluster of formatsData.clusters) {
    content.appendChild(buildGroup(cluster, node, footer))
  }

  updateFooter(footer, node)
}

/**
 * Builds one collapsible group for a platform cluster (e.g. "Facebook & Instagram").
 * Contains a header with the cluster name and a "Select all / Clear" toggle,
 * plus one checkbox row per format.
 */
function buildGroup(cluster, node, footer) {
  const group = document.createElement('div')
  group.className = 'adformat-group'

  // Group header — cluster name on the left, toggle on the right
  const header = document.createElement('div')
  header.className = 'adformat-group-header'

  const name = document.createElement('span')
  name.className = 'adformat-group-name'
  name.textContent = cluster.cluster

  const toggle = document.createElement('button')
  toggle.className = 'adformat-toggle'
  toggle.textContent = 'Select all'
  toggle.addEventListener('click', () => {
    const allChecked = cluster.formats.every(f => isSelected(node, f))
    cluster.formats.forEach(f => allChecked ? deselect(node, f) : select(node, f))
    // Rebuild the group checkboxes to reflect the new state
    group.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.checked = !allChecked
    })
    toggle.textContent = allChecked ? 'Select all' : 'Clear'
    updateFooter(footer, node)
  })

  header.appendChild(name)
  header.appendChild(toggle)
  group.appendChild(header)

  // One row per format
  for (const format of cluster.formats) {
    group.appendChild(buildRow(format, node, footer, toggle, cluster))
  }

  return group
}

/**
 * Builds one checkbox row for a single ad format.
 * Shows the format name on the left and its ratio on the right.
 */
function buildRow(format, node, footer, toggle, cluster) {
  const row = document.createElement('label')
  row.className = 'adformat-row'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = isSelected(node, format)
  checkbox.addEventListener('change', () => {
    checkbox.checked ? select(node, format) : deselect(node, format)
    // Update the group toggle label
    const allChecked = cluster.formats.every(f => isSelected(node, f))
    toggle.textContent = allChecked ? 'Clear' : 'Select all'
    updateFooter(footer, node)
  })

  const label = document.createElement('span')
  label.className = 'adformat-row-name'
  label.textContent = format.name

  const ratio = document.createElement('span')
  ratio.className = 'adformat-row-ratio'
  ratio.textContent = format.formatRatio

  row.appendChild(checkbox)
  row.appendChild(label)
  row.appendChild(ratio)
  return row
}

/**
 * Returns true if the given format is already in node.selectedFormats.
 */
function isSelected(node, format) {
  return node.selectedFormats.some(f => f.name === format.name)
}

/**
 * Adds a format to node.selectedFormats if not already present.
 */
function select(node, format) {
  if (!isSelected(node, format)) node.selectedFormats.push(format)
}

/**
 * Removes a format from node.selectedFormats.
 */
function deselect(node, format) {
  node.selectedFormats = node.selectedFormats.filter(f => f.name !== format.name)
}

/**
 * Updates the footer text to show how many formats are currently selected.
 */
function updateFooter(footer, node) {
  const count = node.selectedFormats.length
  footer.textContent = count === 0
    ? 'No formats selected'
    : count + ' format' + (count === 1 ? '' : 's') + ' selected'
}

export { openPanel }
