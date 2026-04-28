/**
 * Saves and loads the graph state using IndexedDB.
 * IndexedDB is a browser-side database that survives page reloads and
 * has no practical size limit — it handles text, JSON, and base64 images.
 */

const DB_NAME    = 'node-prompt-builder'
const DB_VERSION = 1
const STORE_NAME = 'graph'

// The key under which the single graph snapshot is stored
const GRAPH_KEY  = 'canvas'

/**
 * Opens the IndexedDB database, creating it on first run.
 * Returns a Promise that resolves with the database connection.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // Runs the first time (or after a version bump) — creates the store
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror   = (e) => reject(e.target.error)
  })
}

/**
 * Saves the serialized graph to IndexedDB as a JSON Blob.
 * Storing a Blob (rather than a plain object) bypasses a Chrome bug where
 * reading large structured values from IndexedDB fails with "UnknownError:
 * Failed to read large IndexedDB value" when the data exceeds ~20MB.
 * A Blob is written to disk via a separate file-backed path that has no
 * such size limit, making it safe even with many base64 images in the graph.
 * Passing null clears the saved state (used by "New Project").
 */
export async function saveGraph(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Wrap the JSON string in a Blob so Chrome stores it via the file-backed path
    const value   = data ? new Blob([JSON.stringify(data)], { type: 'application/json' }) : null
    const request = store.put(value, GRAPH_KEY)

    request.onsuccess = () => resolve()
    request.onerror   = (e) => reject(e.target.error)
  })
}

/**
 * Loads the previously saved graph from IndexedDB and returns it as a plain object.
 * Returns null if nothing has been saved yet (first run).
 * Handles both the new Blob format and the old plain-object format so existing
 * saves are not lost after this change is deployed.
 *
 * If reading fails — e.g. Chrome's "Failed to read large IndexedDB value" bug
 * that fires when a previously-saved plain-object value exceeds ~20MB — the
 * corrupted save is deleted and null is returned so the app starts fresh rather
 * than crashing with an uncaught error every time the page loads.
 */
export async function loadGraph() {
  try {
    const db = await openDB()
    const value = await new Promise((resolve, reject) => {
      const tx      = db.transaction(STORE_NAME, 'readonly')
      const store   = tx.objectStore(STORE_NAME)
      const request = store.get(GRAPH_KEY)
      request.onsuccess = (e) => resolve(e.target.result ?? null)
      request.onerror   = (e) => reject(e.target.error)
      tx.onerror        = (e) => reject(e.target.error)
    })

    if (!value) return null

    // New format — stored as a Blob: decode the JSON text inside it
    if (value instanceof Blob) {
      const text = await value.text()
      return JSON.parse(text)
    }

    // Old format — stored as a plain object: return directly
    return value

  } catch (err) {
    // Reading failed — most likely Chrome's large-value bug on an old plain-object save.
    // Clear the unreadable value so the next page load does not crash again.
    console.warn('[storageUtils] Failed to load graph — clearing save:', err.message)
    try { await saveGraph(null) } catch (_) { /* ignore secondary failure */ }
    return null
  }
}
