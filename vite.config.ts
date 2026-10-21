import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';

/**
 * Lists every built file in precache.json so the service worker (public/sw.js)
 * can store the whole app for offline use on the first visit.
 */
function precacheManifest(): Plugin {
  return {
    name: 'dtp-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const version = createHash('sha256').update(files.sort().join('\n')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify({ version, files: ['./', ...files] }) });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), precacheManifest()],
  build: { chunkSizeWarningLimit: 1200 },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
