# Hoagies — Online Ordering Website

A self-hosted online ordering website for Hoagies (Cheesesteaks & More), built with React. No third-party ordering platform subscription required — you own the code, the hosting, and the customer data.

## Features

- Bilingual menu (English / Arabic with full RTL layout)
- Pickup and Delivery toggle
- Cart with quantity controls, persisted in the browser
- Checkout form (name, phone, address for delivery, notes)
- Orders are sent straight to your restaurant's WhatsApp number as a pre-filled message — no backend server or payment subscription needed to start taking orders
- Cash on Delivery / Pay at Pickup by default; a "Pay by Card" option is scaffolded and ready to switch on once you connect a real payment provider
- Phone number login with SMS OTP verification (Jordan, +962) via Firebase Phone Authentication, before customers can browse the menu

## Phone login (OTP) setup

Customers verify their phone number with an SMS code before ordering, using [Firebase Phone Authentication](https://firebase.google.com/docs/auth/web/phone-auth) (free for typical small-restaurant volumes, no server of your own required).

1. Go to the [Firebase console](https://console.firebase.google.com/), create a project.
2. In **Build → Authentication → Sign-in method**, enable the **Phone** provider.
3. In **Project settings → General → Your apps**, add a **Web app** and copy its config values.
4. Copy `.env.example` to `.env` and fill in the values:
   ```
   REACT_APP_FIREBASE_API_KEY=...
   REACT_APP_FIREBASE_AUTH_DOMAIN=...
   REACT_APP_FIREBASE_PROJECT_ID=...
   REACT_APP_FIREBASE_APP_ID=...
   ```
5. Still in the Firebase console, under **Authentication → Settings → Authorized domains**, add the domain you'll deploy to (e.g. your restaurant's domain) so phone sign-in works there too.
6. Restart `npm start` / rebuild — the login screen will switch from the "Firebase setup needed" notice to the real phone/OTP flow.

Until `.env` is filled in, the site shows a setup notice on the login screen instead of crashing, so you can keep developing everything else in the meantime.

## Configuration

Edit `src/config/restaurant.js`:

```js
const restaurant = {
  name: 'Hoagies',
  tagline: { en: 'Cheesesteaks & More', ar: '...' },
  currency: 'JOD',
  whatsappNumber: '9627XXXXXXXX', // your restaurant's WhatsApp number, international format, no + or spaces
  onlinePaymentEnabled: false,    // set true once a payment provider is wired up
}
```

Edit the menu itself in `src/data/menu.js` (categories + items, English & Arabic name/description/price).

## Online card payments

Card payment is not connected out of the box — that requires your own merchant account with a payment provider (e.g. Stripe, HyperPay, PayTabs) and, typically, a small backend/serverless function to create the charge securely. Once you have provider credentials, wire the "Pay by Card" option in `src/pages/Checkout.js` to that provider's checkout flow and set `onlinePaymentEnabled: true` in the config above.

## Development

```
npm install
npm start       # local dev server
npm run build   # production build in /build, deployable to any static host or your own domain
```

If you hit an OpenSSL error running on newer Node.js versions, use:

```
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

## Deployment

The `build/` folder is a static site — deploy it to your own domain via any static host (Netlify, Vercel, S3 + CloudFront, a plain VPS with nginx, etc.).
