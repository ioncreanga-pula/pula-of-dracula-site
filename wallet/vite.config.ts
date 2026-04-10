import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'C.U.R. Wallet - PULA of Dracula',
        short_name: 'CUR Wallet',
        description: 'Official PULA of Dracula Mobile Wallet',
        theme_color: '#121212',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    allowedHosts: true, // Permite orice host (Serveo, Ngrok, etc.)
  },
  resolve: {
    alias: {
      // Polyfill-uri suplimentare dacă e nevoie
    }
  }
})
