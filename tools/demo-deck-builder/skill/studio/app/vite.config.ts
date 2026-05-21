import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_DEMO_DECK_STUDIO_API_URL || 'http://127.0.0.1:7333';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 7332,
    strictPort: false,
    proxy: {
      '/api': apiTarget,
      '/deck': apiTarget
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 7332
  }
});
