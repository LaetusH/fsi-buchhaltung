import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-12-05',
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      cashRegisterMode: process.env.CASH_REGISTER_MODE || 'standalone',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    },
  },
  ignore: ['service-worker/**'],
  app: {
    // Allow hosting under a subpath like /buchhaltung
    baseURL: process.env.APP_BASE_URL || '/'
  },
  vite: {
    plugins: [tailwindcss()]
  },
  pages: false,
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    },
    registerType: 'autoUpdate',
    // Without this there is no service worker under `npm run dev`, so `navigator.serviceWorker.ready`
    // never resolves and web push cannot be subscribed to or received while developing.
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true,
    },
    manifest: {
      name: 'FSi Portal',
      short_name: 'FSi Portal',
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