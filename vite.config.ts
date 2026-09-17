import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/reeleks/'

export default defineConfig({
  // GitHub Pages project sites are served from /<repository>/.
  // Without this, Vite points JS/CSS to the domain root and the app renders blank.
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: base,
        name: 'REELEKS',
        short_name: 'REELEKS',
        description: 'Drama pendek, cepat, ringan, bikin betah.',
        theme_color: '#070707',
        background_color: '#070707',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icon-192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${base}icon-512.png`,
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'reeleks-images-v1',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    sourcemap: false
  }
})
