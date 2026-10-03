/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// W Dockerze backend jest pod http://backend:8000, lokalnie pod localhost
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': apiTarget },
    // Docker na Windows/WSL nie przekazuje zdarzeń zmian plików - wtedy odpytujemy dysk
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
