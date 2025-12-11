import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Safely get environment variable with fallback
const getEnv = (key, defaultValue) => {
  // Check if import.meta.env exists
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: getEnv('VITE_API_URL', 'http://localhost:8000'),
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
