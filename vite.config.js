import { defineConfig } from 'vite';

export default defineConfig({
    base: '/mini-voxel-engine/',
  root: './public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
