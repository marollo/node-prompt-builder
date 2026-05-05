/**
 * Manages a dedicated IndexedDB database for generated images.
 * Completely separate from the graph store so images persist independently
 * of whether the nodes that created them still exist on the canvas.
 */

const DB_NAME = 'gallery-db'
const STORE   = 'images'
const VERSION = 1

/**
 * Opens the gallery database, creating it on first run.
 * Returns a Promise that resolves with the database connection.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        // Auto-incrementing id so each image gets a unique key
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

/**
 * Saves one base64 image to the gallery.
 * label identifies which node produced it (e.g. 'NB2 Model').
 */
export async function saveToGallery(src, label) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add({ src, label, timestamp: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror    = (e) => reject(e.target.error)
  })
}

/**
 * Returns all saved images as an array, newest first.
 */
export async function loadAllFromGallery() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = (e) => resolve(e.target.result.reverse())
    req.onerror   = (e) => reject(e.target.error)
  })
}
