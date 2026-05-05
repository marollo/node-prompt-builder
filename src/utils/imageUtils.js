// Helper functions for loading, resizing, and encoding reference images.

/**
 * Fetches an image from an https:// URL and returns it as a base64 data URL.
 * Used by model nodes to convert temporary CDN URLs into storable strings.
 */
async function fetchAsBase64(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export { fetchAsBase64 }
