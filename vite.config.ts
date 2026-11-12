import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// One id per build. The app compares it with the deployed version.json so a tab
// that's been open for days (common on phones) notices a new deploy and updates.
const BUILD_ID = Date.now().toString(36);

const versionFile = (): Plugin => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) + '\n' });
  },
});

// Relative base so the build works both at
// https://<user>.github.io/claude-project-manager/ and on a custom domain root.
export default defineConfig({
  base: './',
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
