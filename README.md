# Payment Gateway Starter: Web

Nuxt 4 + Nuxt UI storefront and admin dashboard for the [payment gateway starter API](https://github.com/Mauludinegi/payment-gateway-starter) (Spring Boot, Xendit, Midtrans). Customers buy from a small catalogue and pay with a virtual account, QRIS, an e-wallet, or at a retail outlet; the order page updates on its own when the gateway's webhook arrives. Customers sign in with Google (Firebase) before checking out and get a dashboard of their orders. Admins see revenue, every payment attempt, and every webhook.

<table>
  <tr>
    <td><img src="docs/05-qris.png" alt="QRIS payment page with countdown" width="420"></td>
    <td><img src="docs/08-account.png" alt="Customer dashboard with order history" width="420"></td>
  </tr>
  <tr>
    <td><img src="docs/02-login.png" alt="Sign in with Google" width="420"></td>
    <td><img src="docs/09-admin-overview.png" alt="Admin overview with revenue and payment methods" width="420"></td>
  </tr>
  <tr>
    <td><img src="docs/06-virtual-account.png" alt="Virtual account instructions" width="420"></td>
    <td><img src="docs/11-admin-order-detail.png" alt="Admin order detail with payment attempts and webhooks" width="420"></td>
  </tr>
</table>

## Quick start

Start the API first (Java 21+, no keys needed; it uses the built-in payment simulator):

```bash
git clone https://github.com/Mauludinegi/payment-gateway-starter.git
cd payment-gateway-starter && ./mvnw spring-boot:run
```

Then the web app (Node 22+):

```bash
npm install
npm run dev
```

Open http://localhost:3000, add something to the cart, sign in (without Firebase keys, use the dev sign-in with any name and email), check out, pick a method, and press **Mark paid** in the simulator panel. The admin is at http://localhost:3000/admin; locally the token is `demo-admin-token` unless you set `ADMIN_TOKEN` on the API.

Everything in Docker (API, PostgreSQL, web), with the API repo cloned next to this one:

```bash
docker compose up --build
```

## What's inside

**Store**

- Catalogue with category filter, cart kept in a cookie (so the server-rendered page shows the right count), and checkout with validation. Browsing and the cart are open; checkout asks the customer to sign in first and comes back to the cart. The browser only sends product IDs and quantities; the API prices the order.
- Payment page: choose from the channels the API has configured, then see a grouped VA number with copy, a QRIS code, a retail payment code, or an e-wallet link with a QR for desktop. Each has how-to-pay steps and a countdown.
- The page polls the order every 3 seconds and switches to "Payment received" when the webhook has been processed. Customers can change method; the API cancels the old one, and an old payment that still arrives is counted.
- "My account" (sign-in required) shows the profile, totals (orders, paid, awaiting payment, total spent), and the order history from the API. Order pages are only visible to the customer who placed them.

**Admin**

- Overview: revenue, orders, conversion, expired orders, revenue for the last 7 days, and successful payments by method. Orders paid twice (old method paid after switching) are flagged for refund.
- Orders: search by reference, name, or email; filter by status; paginate.
- Order detail: items, every payment attempt with its gateway reference, and the webhooks for it. **Re-check with gateway** pulls the current status, for when a webhook was missed.
- Webhooks: every verified event with the status the gateway confirmed on re-check and whether it changed anything.

## How it talks to the API

The browser only calls this app. `server/api/[...path].ts` forwards `/api/**` to the Spring Boot API (`NUXT_API_BASE`), so there is no CORS setup and the API does not need to be public, except for `/webhooks/*`, which the gateways call directly.

### Customer sign-in

1. `/login` opens the Google popup with the Firebase JS SDK and gets an ID token. Firebase's own session is signed out right away.
2. The token goes to `/auth/google` on this app's server, which passes it to the API. The API verifies it and returns a session token, which the server stores in an **http-only, same-site lax cookie** (`session`); the browser only gets the user.
3. The proxy adds that cookie as a bearer token to customer `/api/**` requests. It refuses `/api/auth/*` sign-in paths, so session tokens never pass through browser JavaScript.
4. A readable `signed_in` flag tells the app to load the user during server rendering; the `auth` route middleware sends signed-out visitors to `/login?redirect=…`. Signing out revokes the session in Redis.

Lax rather than strict, so a customer coming back from an e-wallet app lands on the order page still signed in.

### Admin sign-in

Admin sign-in posts the token to `/auth/admin/login`, which checks it against the API and stores it in an **http-only, same-site strict cookie**. The proxy adds it as a bearer token to `/api/admin/**` requests; browser JavaScript never sees it. A readable `admin_signed_in` flag lets route middleware redirect to the login page, and any 401 clears the session.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NUXT_API_BASE` | `http://localhost:8080` | API URL as seen from the Nuxt server |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | | Firebase web app config, for Google sign-in |
| `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | | e.g. `your-project.firebaseapp.com` |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | | Must match `FIREBASE_PROJECT_ID` on the API |
| `NUXT_PUBLIC_FIREBASE_APP_ID` | | |

The Firebase web config is public by design. In the Firebase console, enable **Authentication > Sign-in method > Google** and add your domain under **Authorized domains** (`localhost` is there by default).

Gateway keys, `ADMIN_TOKEN`, sessions (Upstash Redis), and the e-wallet return URL are set on the API; see its README.

## Stack

Nuxt 4, Nuxt UI 4, Tailwind CSS 4, TypeScript, Zod, Firebase Authentication, `qrcode`. CI runs typecheck, build, and a Docker build.

## License

MIT
