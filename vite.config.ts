import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/outage-live': {
        target: 'https://outage.nammamap.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/outage-live/, '/api/v2')
      }
    }
  }
})
