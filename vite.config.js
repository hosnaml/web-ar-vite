import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['cable-scenarios-deaf-obituaries.trycloudflare.com'],
    cors: true // Enable CORS for development
  },
  build: {
    assetsInlineLimit: 0 // Ensure images are processed as assets rather than inlined
  }
})
