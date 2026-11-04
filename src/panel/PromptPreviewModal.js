/**
 * Read-only pop-up that shows the exact prompt a model node is about to send (backlog #14).
 * Opened by the "View prompt" button on NB2, Recraft, Qwen, Camera Move and Model Polas.
 */

// The pop-up element — built once the first time it is needed, then reused
let _modalEl = null

/**
 * Builds the pop-up (title, close button, read-only text box) and adds it to the page.
 * Called only once, the first time showPromptPreview() runs.
 */
function buildModal() {
  const overlay = document.createElement('div')
  overlay.id = 'prompt-preview-modal'
  overlay.innerHTML = `
    <div id="prompt-preview-box">
      <div id="prompt-preview-toolbar">
        <span id="prompt-preview-title"></span>
        <button id="prompt-preview-close">✕</button>
      </div>
      <textarea id="prompt-preview-text" readonly></textarea>
    </div>
  `
  document.body.appendChild(overlay)

  // Close with the ✕ button or by clicking the dark area around the box
  overlay.querySelector('#prompt-preview-close').addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
  // The Escape key closes it too, as people expect from a pop-up. "true" makes the page hear the key
  // first, before the canvas library, which otherwise swallows key presses and stops them here
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal() }, true)
  return overlay
}

/**
 * Opens the pop-up with a title (the node's name) and the prompt text.
 * The text box is read-only, so the user can read and copy it but not change what is sent.
 */
function showPromptPreview(title, text) {
  if (!_modalEl) _modalEl = buildModal()
  _modalEl.querySelector('#prompt-preview-title').textContent = `Prompt — ${title}`
  // Putting the prompt in the text box's value shows it as plain text, never as page code
  _modalEl.querySelector('#prompt-preview-text').value = text || '(no prompt yet — connect a prompt first)'
  _modalEl.style.display = 'flex'
}

/**
 * Hides the pop-up. Called by the ✕ button or a click outside the box.
 */
function closeModal() {
  if (_modalEl) _modalEl.style.display = 'none'
}

export { showPromptPreview }
