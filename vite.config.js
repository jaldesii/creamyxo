import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigationPreload: false
      },
      includeAssets: ['icons/icon.png', 'favicon.ico'],
      manifest: {
        name: 'Cremyxo - Anonymous Chat',
        short_name: 'Cremyxo',
        description: 'Free anonymous chat for Filipinos. No registration needed!',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: '/',
        icons: [
          { src: '/icons/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      devOptions: { enabled: true, type: 'module' }
    })
  ],
  server: { host: true, port: 5173 }
});