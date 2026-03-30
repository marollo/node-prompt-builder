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
 * Saves the serialized graph object to IndexedDB.
 * Overwrites any previously saved state.
 * Called automatically every 2 seconds by canvas.js.
 */
export async function saveGraph(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite')
    const store   = tx.objectStore(STORE_NAME)
    const request = store.put(data, GRAPH_KEY)
    request.onsuccess = () => resolve()
    request.onerror   = (e) => reject(e.target.error)
  })
}

/**
 * Loads the previously saved graph object from IndexedDB.
 * Returns null if nothing has been saved yet (first run).
 * Called once at startup by canvas.js before creating any nodes.
 */
export async function loadGraph() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly')
    const store   = tx.objectStore(STORE_NAME)
    const request = store.get(GRAPH_KEY)
    request.onsuccess = (e) => resolve(e.target.result || null)
    request.onerror   = (e) => reject(e.target.error)
  })
}
