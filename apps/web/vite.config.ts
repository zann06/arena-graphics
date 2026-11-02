import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@arena/shared': '/../../packages/shared/src',
      '@arena/graphics-core': '/../../packages/graphics-core/src',
    },
  },
  server: {
    port: 5173,
    // Dev server proxies API calls to the local backend so the frontend always
    // talks to a same-origin `/api` path.
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:4000', ws: true, changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
});
