import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  test: {
    dir: './src',
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    clearMocks: true,
    css: true
  }
});
