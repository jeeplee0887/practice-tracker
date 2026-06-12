import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path matches the GitHub Pages project URL: /practice-tracker/
export default defineConfig({
  base: '/practice-tracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Practice Tracker',
        short_name: 'Practice',
        start_url: '/practice-tracker/',
        scope: '/practice-tracker/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6366f1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell precache. Raise the size limit so large JS chunks (tfjs) are precached.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Cache the YAMNet model files + class map (cross-origin) for offline use.
            urlPattern: ({ url }) =>
              url.href.includes('tfhub.dev') ||
              url.href.includes('kaggle') ||
              url.href.includes('storage.googleapis.com/tfjs-models') ||
              url.href.includes('yamnet_class_map.csv'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'yamnet-model',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
