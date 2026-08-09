import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LEC 22 Hub',
        short_name: 'LEC Hub',
        description: 'Team schedule and knowledge base for LEC interns',
        theme_color: '#8b5cf6',
        icons: [
          {
            src: 'https://vitejs.dev/logo.svg', // Placeholder, we can replace later
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'https://vitejs.dev/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
