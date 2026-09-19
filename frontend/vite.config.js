import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Khi deploy GitHub Pages, đặt base = '/tên-repo/'
  // Ví dụ: base: '/editvideotool-cloud/'
  // Khi dev local, để '/'
  base: process.env.VITE_BASE_URL || '/',
  server: {
    port: 5173,
  },
});
