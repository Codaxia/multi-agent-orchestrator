import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Return a JSON error instead of crashing the page when Express is down.
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API server unavailable — restart Express on port 3001' }));
          });
        },
      },
    },
  },
});
