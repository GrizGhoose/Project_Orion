import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, proxy: { '/sync': 'http://localhost:8080' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', css: false },
});
