import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both at
// https://<user>.github.io/claude-project-manager/ and on a custom domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
});
