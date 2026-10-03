import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/, so production builds need that base.
// Dev server stays at / so local URLs don't change.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/CukaiSmart/' : '/',
}));
