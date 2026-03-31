import { defineConfig } from 'vite';

export default defineConfig({
  // Multi-page app
  build: {
    rollupOptions: {
      input: {
        main:  'index.html',
        admin: 'admin.html',
        login: 'login.html',
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  // Optimise large libraries
  optimizeDeps: {
    include: ['three', 'chart.js'],
  },
});
