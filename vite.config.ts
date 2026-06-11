import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/taiex-pullback-monitor/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
