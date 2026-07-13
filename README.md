# GOLDWIRE Backend

Real accounts, real signal delivery, a subscriber dashboard, and an admin panel —
everything the marketing site needs to work as a real product instead of a mockup.

## What's included

- **User accounts** — signup/login with hashed passwords + JWT sessions
- **Signal delivery by email** — sent automatically to every subscriber when a
  signal is posted (Starter plan gets a 15-minute delay, matching the site's copy)
- **Two ways to post a signal:**
  - `public/admin.html` — a simple password-protected webpage, fill a form, hit send
  - `POST /api/signals/webhook` — for your MT5 EA to call directly and post
    signals automatically
- **Subscriber dashboard** — `public/dashboard.html`, where a logged-in
  subscriber sees their signal history
- SQLite database (a single file, `data/goldwire.db`) — no external database to manage

## What still needs YOUR real credentials

I can't fake these — you'll need to plug in your own:

1. **SMTP credentials**, so emails actually send. Any of these work:
   - Gmail (free, use an "App Password", not your normal password)
   - [Resend](https://resend.com) (free tier, made for this)
   - SendGrid / Mailgun (free tiers available)
   Without this, signals still get created and logged — they just won't email anyone.

2. **A hosting provider for the backend itself.** Netlify hosts your *frontend*
   (the marketing site), but it can't run this Node server. Good free options:
   - [Render](https://render.com) — free "Web Service", easiest for beginners
   - [Railway](https://railway.app) — also easy, has a small free tier

## Local setup (to test before deploying)

```bash
npm install
cp .env.example .env
# open .env and fill in JWT_SECRET, ADMIN_PASSWORD, MT5_WEBHOOK_SECRET
# with your own random strings — anything long and hard to guess works
node server.js
```

Server runs at `http://localhost:4000`.

- Admin panel: `http://localhost:4000/admin.html`
- Subscriber dashboard: `http://localhost:4000/dashboard.html`

## Deploying to Render (recommended, free)

1. Push this `goldwire-backend` folder to a GitHub repo
2. On Render: **New → Web Service** → connect that repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add your environment variables from `.env.example` in Render's dashboard
   (Environment tab) — **do not** commit your real `.env` file to GitHub
6. Deploy — Render gives you a URL like `https://goldwire-backend.onrender.com`

## Connecting the marketing site to your live backend

Open `goldwire-signals-site.html` (the Netlify site) and find this line near
the top of the `<script>` block at the bottom of the file:

```js
const API_BASE = window.GOLDWIRE_API_BASE || 'http://localhost:4000';
```

Change `'http://localhost:4000'` to your real Render URL, e.g.:

```js
const API_BASE = window.GOLDWIRE_API_BASE || 'https://goldwire-backend.onrender.com';
```

Do the same inside `public/dashboard.html` and `public/admin.html` if you move
them elsewhere. Re-deploy the site to Netlify after this change.

## Connecting your MT5 EA

Your EA can call the webhook directly whenever your strategy fires a signal.
Example (pseudocode — MQL5's `WebRequest` function):

```
POST https://goldwire-backend.onrender.com/api/signals/webhook
Headers:
  Content-Type: application/json
  x-webhook-secret: <your MT5_WEBHOOK_SECRET from .env>
Body:
  {
    "instrument": "XAU/USD",
    "direction": "buy",
    "entry": "2384.20",
    "stop_loss": "2378.00",
    "take_profit": "2396.50",
    "note": "EMA + RSI + MACD aligned"
  }
```

Note: MQL5's `WebRequest` requires whitelisting the domain in
MT5 → Tools → Options → Expert Advisors → "Allow WebRequest for listed URL".

## Payments

Not wired in yet, on purpose (you asked to skip this for now). When you're
ready: Lemon Squeezy is the simplest to add for Kenya — I can wire in their
checkout + webhook to automatically upgrade a user's `plan` field once
you're ready to charge real money.

## Security notes before going fully live

- Change every value in `.env` from the example placeholders
- Restrict CORS in `server.js` to your real Netlify domain instead of `*`
- Consider rate-limiting `/api/auth/signup` and `/api/admin/login` to prevent abuse
- Back up `data/goldwire.db` periodically — it's your entire user database
