import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-12-05',
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  app: {
    // Allow hosting under a subpath like /buchhaltung
    baseURL: process.env.APP_BASE_URL || '/'
  },
  vite: {
    plugins: [tailwindcss()]
  },
  pages: false,
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Buchhaltung',
      short_name: 'Buchhaltung',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/logo-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/logo-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/logo-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    }
  }
})