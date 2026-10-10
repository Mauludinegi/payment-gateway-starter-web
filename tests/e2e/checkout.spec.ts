import { expect, test, type Page } from '@playwright/test'

/** Checkout against the backend's simulator gateway: no real gateway, no real money. */

async function signIn(page: Page, email: string, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByPlaceholder('Budi Santoso').fill('E2E Shopper')
  await page.getByPlaceholder('budi@example.com').fill(email)
  await page.getByRole('button', { name: 'Sign in without Google' }).click()
  await page.waitForURL(url => url.pathname === redirect)
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible()
}

/** Adds the first product to the cart and places the order; returns the order id. */
async function placeOrder(page: Page): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await page.goto('/cart')
  await page.locator('input[autocomplete="name"]').fill('E2E Shopper')
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/)
  return page.url().split('/').pop()!
}

test('checkout requires signing in first', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)account/)
})

test('shows the sandbox label when only test credentials are configured', async ({ page }) => {
  const environment = await (await page.request.get('/api/environment')).json()
  expect(environment.sandbox).toBe(true)
  await page.goto('/')
  await expect(page.getByTestId('sandbox-banner')).toContainText('Sandbox demo, no real money')
})

test('customer pays an order with a virtual account', async ({ page }) => {
  await signIn(page, 'e2e-buyer@example.com')
  await placeOrder(page)

  await page.getByRole('button', { name: 'BRI Virtual Account' }).click()
  await page.getByRole('button', { name: 'Pay with BRI Virtual Account' }).click()
  await expect(page.getByText('Waiting for payment')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible()

  // The simulator plays the gateway: it sends a signed webhook, and the page updates on its own.
  await page.getByRole('button', { name: 'Mark paid' }).click()
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible()
})

test('a double click or retried request starts one payment', async ({ page }) => {
  await signIn(page, 'admin@example.com')
  const orderId = await placeOrder(page)

  await page.getByRole('button', { name: 'QRIS' }).click()
  await page.getByRole('button', { name: 'Pay with QRIS' }).dblclick()
  await expect(page.getByText('Waiting for payment')).toBeVisible()

  // Two requests racing with the same key, as a retry after a dropped connection would send.
  const ids = await page.evaluate(async (id) => {
    const start = () => fetch(`/api/orders/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `retry-${id}` },
      body: JSON.stringify({ channel: 'ALFAMART' }),
    }).then(r => r.json())
    const [a, b] = await Promise.all([start(), start()])
    return [a.payment.id, b.payment.id]
  }, orderId)
  expect(ids[0]).toBe(ids[1])

  const detail = await (await page.request.get(`/api/admin/orders/${orderId}`)).json()
  // The QRIS payment (started once despite the double click) and the Alfamart one it was switched to.
  expect(detail.payments.map((p: { channel: string }) => p.channel).sort()).toEqual(['ALFAMART', 'QRIS'])
})
