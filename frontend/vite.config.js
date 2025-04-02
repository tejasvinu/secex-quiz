import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = `http://${env.VITE_BACKEND_HOST || 'localhost'}:${env.VITE_BACKEND_PORT || '5000'}`
  
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_HOST || 'localhost',
      port: parseInt(env.VITE_PORT || '5173'),
      proxy: {
        '/socket.io': {
          target: backendUrl,
          ws: true,
          changeOrigin: true
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  }
})
