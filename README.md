# Hoagies — Online Ordering Website

A self-hosted online ordering website for Hoagies (Cheesesteaks & More), built with React. No third-party ordering platform subscription required — you own the code, the hosting, and the customer data.

## Features

- Bilingual menu (English / Arabic with full RTL layout)
- Pickup and Delivery toggle
- Cart with quantity controls, persisted in the browser
- Checkout form (name, phone, address for delivery, notes)
- Orders are sent straight to your restaurant's WhatsApp number as a pre-filled message — no backend server or payment subscription needed to start taking orders
- Cash on Delivery / Pay at Pickup by default; a "Pay by Card" option is scaffolded and ready to switch on once you connect a real payment provider

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
