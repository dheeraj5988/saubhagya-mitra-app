# Saubhagya Voter Slip — website update (21.09.2026)

Instructions for Antigravity (or anyone applying this package).

## 1. Copy the files

This zip holds **only the changed and new files**, in the same folder
structure as the repo `saubhagya-mitra-app`.

Unzip it **into the project root** and overwrite existing files. Do not delete
anything else. No new npm packages are needed.

New files:

- `src/lib/business.ts` — business name, legal line, emails, hours (one place)
- `src/content/policies.ts` — Hindi + English text for all policy pages
- `src/components/SiteChrome.tsx` — shared header and footer
- `src/routes/about.tsx` — /about
- `src/routes/pricing.tsx` — /pricing
- `public/sitemap.xml`
- `supabase/migrations/20260921100000_pad_booths.sql`

Replaced files:

- `src/components/OrderForm.tsx`, `src/components/LegalPage.tsx`
- `src/lib/pricing.ts`, `campaign.ts`, `orders.schema.ts`, `orders.functions.ts`,
  `geo.functions.ts`, `geo.schema.ts`, `i18n.tsx`
- `src/routes/index.tsx`, `__root.tsx`, `terms.tsx`, `privacy.tsx`, `refund.tsx`,
  `shipping.tsx`, `contact.tsx`
- `src/styles.css`, `public/robots.txt`
- `src/routeTree.gen.ts` (auto-generated; the dev server rebuilds it anyway)

Not touched: the admin panel (`src/routes/admin.tsx`, `src/components/admin/*`).

## 2. Fill in the legal details (owner)

Open `src/lib/business.ts` and fill, exactly as on PAN / GST:

```ts
export const LEGAL_NAME = "";       // legal name
export const PROPRIETOR_NAME = "";  // proprietor
export const GSTIN = "";            // 15 characters, or leave empty
```

Empty values are hidden on the site. The "GST Composition" wording only
appears once a GSTIN is filled. The legal name must match the Cashfree KYC.

## 3. Run the database migration

Run `supabase/migrations/20260921100000_pad_booths.sql` on the Supabase
project (Supabase dashboard → SQL Editor → paste → Run). It is safe to run
twice. It adds:

- table `geo_booths` (भाग / polling stations per ward, with voter counts)
- columns `orders.pad`, `orders.booth_ids`, `orders.booth_snapshots`

If the migration has not been run yet, orders still save — the post and
booths are written into `body_name` instead.

## 4. Run and check

```bash
npm install
npm run dev
```

Check:

- [ ] Header and footer show only "सौभाग्य वोटर स्लिप / Saubhagya Voter Slip"
- [ ] Home: rate strip above the form (P 15 · S / A 16 · Ph 20 paise)
- [ ] Form: पद chips → ज़िला → समिति → ग्राम पंचायत → वार्ड (voter count shown)
- [ ] सरपंच selects all wards automatically; पंच allows one ward only
- [ ] Design tiles: P-16, P-12, SR-10, SL-10, AT-9, AT-8, AL-8, AR-8, each with its rate
- [ ] Typing English letters in the candidate name or slogan shows an error and blocks submit
- [ ] Banner card appears only for SR / SL / AT / AL / AR and shows the size
      (AT-8: 94.6 × 34.2 mm = 3.72 × 1.35 inch) with a copy button
- [ ] Summary box shows voters, pages, rate and amount; amount = voters × rate
- [ ] After submit: order ID, amount, and "ऑनलाइन भुगतान जल्द — अभी WhatsApp पर संपर्क कीजिए"
- [ ] Pages load: /about, /pricing, /terms, /privacy, /refund, /shipping, /contact
- [ ] Footer shows orders@saubhagya.net, working hours and all policy links
- [ ] Hindi / English toggle switches the policy text

`npx tsc --noEmit` passes and `npm run build` succeeds on this package.

## 5. Push

When everything looks right, commit and push to `main`.

## Known follow-ups (not in this package)

- Admin panel: remove the English-name column; show पद, भाग, design label
  (P-16 etc.), banner preview, and the per-series rates.
- Admin import screen for booth data (`geo_booths`). Until booths are
  loaded, the form says "पूरा वार्ड लिया जाएगा".
- The admin "rate per voter" setting no longer drives the price; rates are
  fixed in `src/lib/pricing.ts` (`SERIES_RATES`).
