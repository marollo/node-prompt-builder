import { defineConfig } from 'vite'

/**
 * Vite development server configuration.
 * The proxy section forwards browser requests that start with /api/replicate
 * to Replicate's real API server. This avoids the CORS block that happens when
 * the browser tries to call https://api.replicate.com directly — the browser
 * only sees requests going to its own origin (localhost:5173), and Vite makes
 * the real request server-side where CORS rules do not apply.
 */
export default defineConfig({
  server: {
    proxy: {
      // Any request to /api/replicate/... is forwarded to https://api.replicate.com/v1/...
      '/api/replicate': {
        target: 'https://api.replicate.com',
        changeOrigin: true,
        // Strip the /api/replicate prefix and replace it with /v1
        rewrite: (path) => path.replace(/^\/api\/replicate/, '/v1')
      }
    }
  }
})
