export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  runtimeConfig: {
    // Spring Boot backend; the browser never calls it directly, every /api request goes through server/api.
    apiBase: 'http://localhost:8080',
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
