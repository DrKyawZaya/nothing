# Food Cart POS

A simple point-of-sale web app for a small food business: **sell, buy, stock, reports**.
Burmese / English, prices in MMK. Works on iPhone, iPad and Windows PC from the browser,
keeps working offline, and syncs between devices when back online.

## How it works

- **Setup**: add ingredients (egg, bread, vegetables…) and menu items with a recipe
  (e.g. American breakfast = 2 eggs + 2 slices bread + 50 g vegetables).
- **Buy**: record ingredient purchases. Stock goes up and the cost per unit is updated
  from the latest purchase price.
- **Sell**: tap menu items and choose Cash / KBZPay / WavePay. Each sale deducts
  ingredients by recipe. The screen shows how many portions can still be made.
- **Stock**: ingredients left, with low-stock warnings. Adjust for waste or to match a
  physical count.
- **Reports**: sales, ingredient cost, gross profit, purchases, top items and payment
  split for today / this week / this month. Deleting a sale or purchase restores stock.

Data is stored in Firebase Firestore with offline persistence. Each login has its own
private data, and signing in with the same account on another device shows the same data.

## First-time setup (about 15 minutes, free)

1. Create a project at <https://console.firebase.google.com> (the free Spark plan is enough).
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode, nearest region, e.g. `asia-southeast1`).
4. **Project settings → Your apps → Web (`</>`)** → register an app and copy the config values.
5. Locally:

   ```sh
   npm install
   cp .env.example .env.local   # paste the config values
   npx firebase login
   npx firebase use --add        # pick your project
   npm run deploy                # builds, deploys the site and security rules
   ```

6. Open the `https://<project>.web.app` URL it prints. Create the account once, then sign in
   with it on every device.
   - **iPhone/iPad:** Safari → Share → *Add to Home Screen*
   - **Windows:** Chrome/Edge → the install icon in the address bar

## Development

```sh
npm run emulators   # terminal 1: local Firebase (needs Java)
npm run dev         # terminal 2: with VITE_USE_EMULATOR=true in .env.development.local
npm test            # unit tests
npm run lint
```

Code layout: `src/pages/*` (one file per screen), `src/data.ts` (all Firestore reads and
writes), `src/lib/*` (pure stock/report logic with tests), `src/i18n.ts` (Burmese/English text).
