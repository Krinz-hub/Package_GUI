import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const BACKEND_PORT = process.env.VITE_BACKEND_PORT || process.env.PORT || '4173';
const BACKEND_HOST = process.env.HOST || '127.0.0.1';
const BACKEND_HTTP = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const BACKEND_WS = `ws://${BACKEND_HOST}:${BACKEND_PORT}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: BACKEND_HTTP,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && 'writeHead' in res) {
              (res as any).writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  ok: false,
                  error: {
                    code: 'BACKEND_UNAVAILABLE',
                    message: `Cannot proxy request to PACKAGE GUI backend at ${BACKEND_HTTP}. Server may be starting or unreachable.`,
                    details: err.message,
                  },
                })
              );
            }
          });
        },
      },
      '/ws': {
        target: BACKEND_WS,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
