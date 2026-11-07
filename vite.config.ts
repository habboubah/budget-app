import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

/**
 * The on-device text recognition files into public/ocr/ (scripts/copy-ocr.mjs),
 * for dev and every build. It installs missing packages once; a dev server
 * starts even if that fails, a build doesn't.
 */
const ocrFiles = {
  name: 'spartopf-ocr-files',
  // `config` runs before the dev server lists public/, so the files are served from the first start.
  config(_: unknown, env: { command: 'build' | 'serve' }) {
    const args = [path.resolve(__dirname, 'scripts/copy-ocr.mjs'), ...(env.command === 'build' ? ['--strict'] : [])];
    execFileSync(process.execPath, args, { stdio: 'inherit' });
  },
};

export default defineConfig(() => {
  return {
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [
      ocrFiles,
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
        // woff2 is not in workbox's default globPatterns. The display face is
        // bundled, so without this an offline launch would render every
        // amount in the fallback stack.
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // The text recognition (5 MB) is fetched when a photo is first
          // read and kept from then on, instead of on every install.
          globIgnores: ['ocr/**'],
          runtimeCaching: [{ urlPattern: /\/ocr\//, handler: 'CacheFirst', options: { cacheName: 'spartopf-ocr' } }],
        },
        manifest: {
          name: 'Spartopf – Haushaltsbuch',
          short_name: 'Spartopf',
          description: 'A simple, private budget book. No account, everything stays on your phone.',
          theme_color: '#F2F2F7',
          background_color: '#F2F2F7',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
  };
});
