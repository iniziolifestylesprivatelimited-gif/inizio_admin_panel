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
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://api.inizio.in');
            proxyReq.setHeader('referer', 'https://api.inizio.in/');
          });
        }
      },
      '/uploads': {
        target: 'https://api.inizio.in',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'https://api.inizio.in');
            proxyReq.setHeader('referer', 'https://api.inizio.in/');
          });
        }
      }
    }
  },

  build: {
    outDir: 'dist',
  },
})