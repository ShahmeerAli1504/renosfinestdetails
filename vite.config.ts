import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Photos live in public/assets, so Vite's own build output goes to /static
// to keep the two folders separate.
export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'static',
  },
});
