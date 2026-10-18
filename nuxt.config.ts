export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
  runtimeConfig: {
    // Spring Boot backend; the browser never calls it directly, every /api request goes through server/api.
    apiBase: 'http://localhost:8080',
    // Firebase web config is public by design; Google sign-in only works for domains authorised in the Firebase console.
    public: {
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        vapidKey: process.env.NUXT_PUBLIC_FIREBASE_VAPID_KEY || '',
      },
    },
  },
  app: {
    head: {
      title: 'Payment Gateway Starter',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'description', content: 'Demo store and admin for the Spring Boot payment gateway starter (Xendit, Midtrans).' }],
    },
  },
  icon: {
    serverBundle: { collections: ['lucide'] },
  },
})
