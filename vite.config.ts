import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v2': {
        target: 'https://outage.nammamap.in',
        changeOrigin: true
      },
      // Gemini proxy (Cloud Function). No API key in the browser; the function calls Gemini with its own identity.
      '/api/gemini': {
        target: 'https://asia-south1-namma-map-407ca.cloudfunctions.net',
        changeOrigin: true,
        rewrite: () => '/surgegridGemini'
      },
      '/api/outage-live': {
        target: 'https://outage.nammamap.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/outage-live/, '/api/v2')
      }
    }
  }
})
