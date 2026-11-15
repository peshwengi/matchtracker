/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repository>/, set by the deploy workflow.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MatchTracker',
        short_name: 'MatchTracker',
        display: 'standalone',
        theme_color: '#1d6b4f',
        background_color: '#f2f3f5',
        icons: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
