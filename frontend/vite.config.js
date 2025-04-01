import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://backend:5000',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true
      }
    }
  }
})
