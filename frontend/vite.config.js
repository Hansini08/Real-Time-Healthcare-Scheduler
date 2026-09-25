import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // Optional: Define server options if needed
    port: 5173, // Default Vite port
    // proxy: { // Example proxy if needed, but CORS should handle it
    //   '/api': {
    //     target: 'http://localhost:5003', // Your backend port
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // Only if backend routes don't start with /api
    //   }
    // }
  }
})