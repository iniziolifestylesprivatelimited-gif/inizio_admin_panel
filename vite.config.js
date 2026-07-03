import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'https://api.inizio.in',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'https://api.inizio.in',
        changeOrigin: true,
        secure: false
      }
    }
  },

  build: {
    outDir: 'dist',
  },
})