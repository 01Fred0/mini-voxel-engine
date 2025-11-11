import { defineConfig } from 'vite';

export default defineConfig({
    base: '/mini-voxel-engine/',
  // root: './public', // Commented out - use project root instead
      build: {
              publicDir: 'public',
    outDir: 'dist',
              emptyOutDir: true,
              },

  server: {
    port: 5173,
    open: true,
  },
});
