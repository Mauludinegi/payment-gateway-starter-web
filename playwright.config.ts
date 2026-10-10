import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the built app (npm run build) and a running backend on the simulator gateway.
 * NUXT_API_BASE points the app at the backend (default http://localhost:8080); E2E_BASE_URL skips starting
 * the app and tests one that is already running.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node .output/server/index.mjs',
        url: baseURL,
        env: { PORT: '3100', NUXT_API_BASE: process.env.NUXT_API_BASE ?? 'http://localhost:8080' },
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
