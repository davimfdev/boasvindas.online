import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // React/React Router rarely change between deploys; keeping them in
        // their own chunk lets browsers reuse that cache across releases
        // instead of redownloading them with every app-code change.
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // Local dev talks to the API on 3000 through the same origin, so the
    // session cookie behaves exactly as it does behind Nginx Proxy Manager.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
