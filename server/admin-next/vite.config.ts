import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin-next/',
  plugins: [react()],
  server: {
    open: false,
    hmr: { port: 24679 },
  },
  preview: {
    open: false,
  },
});
