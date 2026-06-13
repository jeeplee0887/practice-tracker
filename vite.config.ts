import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Build a human-readable version from git: an always-incrementing build number
// (total commit count) plus the short SHA so a build maps to an exact commit.
// Falls back gracefully when git history isn't available (e.g. shallow clone).
function appVersion(): string {
  const git = (cmd: string, fallback: string) => {
    try {
      return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return fallback;
    }
  };
  const build = git('git rev-list --count HEAD', '0');
  const sha =
    process.env.GITHUB_SHA?.slice(0, 7) ??
    git('git rev-parse --short HEAD', 'dev');
  return `v1.${build} (${sha})`;
}

// Base path matches the GitHub Pages project URL: /practice-tracker/
export default defineConfig({
  base: '/practice-tracker/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
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
        // Precache the app shell AND the self-hosted YAMNet model (json + weight
        // shards) and class map, so the app works fully offline after first load.
        // Shards are ~4 MB each, so keep the per-file limit above that.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,bin,csv}'],
      },
    }),
  ],
});
