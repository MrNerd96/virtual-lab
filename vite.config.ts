import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true, // Automatically open browser
    host: true, // Allow access from network
    hmr: {
      overlay: true, // Show error overlay on screen
    },
    watch: {
      usePolling: false, // Better file watching on Windows
    },
  },
  build: {
    outDir: 'dist',
  },
  base: './',
});