import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [devvit(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@game': resolve(__dirname, 'game'),
    },
  },
  build: {
    rollupOptions: {},
  },
});
