# Saubhagya — Fix orders not working (29.09.2026)

## What broke, in one paragraph

On 26.09 (commit `a49b510`) the site was stable: the home page showed the PC's order page
directly (`iframe → https://order.saubhagya.net/order`). Commits `3eaab8f` … `11169bb`
(28–29.09) changed that. To rewrite the wording for PhonePe, Antigravity put the
**Vercel server in the middle of every order request**: `/live-order` (rewritten HTML),
`/order`, `/order/*`, `/order-api/*`, `/api/order/*`, `/api/p/*`, `/downloads/*`, `/qr/*`,
`/symbols/*` all became a reverse proxy in `src/api.ts`. The PC order app cannot run
behind that. The frontend copy/pricing/software-toggle changes are fine (type-check and
build pass). **Only the proxy is the problem.**

## Why the proxy breaks orders

| # | Problem in the proxy (`src/api.ts`, removed by this fix) | Effect |
|---|---|---|
| 1 | `html.replaceAll(...)` runs on the **whole page including its JavaScript** (`"प्रत्याशी"→"नाम"`, `"मतदान"→"कार्यक्रम"`, `" मतदाता"→" रिकॉर्ड"`, `"वोटर"→""` …). Words inside JS strings, keys and option values change. | Buttons stop working / the PC gets values it does not know. (Already caused one `SyntaxError` that killed all buttons; a "fix" then patched one exact JS line, which breaks again the moment the PC page changes.) |
| 2 | Upstream response headers are copied (`content-encoding: gzip/br`, `content-length`) although Node already decoded the body. | Browser fails to decode → "Failed to fetch", broken JSON/QR/PDF. |
| 3 | Vercel functions cap request/response bodies (~4.5 MB) and run 10–60 s. | Banner photo upload, large PDF download, slow PDF preview fail. |
| 4 | Every customer's request now comes from Vercel's IP, not their own. | The PC's anti-spam rules (3 orders / IP / minute, hold after 5 unpaid) treat **all customers as one person** → orders held/rejected. |
| 5 | Cloudflare bot protection can challenge Vercel's server-side fetch (403). | "Order service returned 403". |
| 6 | Routes `/order/*` on saubhagya.net were hijacked, so the site's own order-tracking route was shadowed. | Tracking of website-fallback orders unreliable. |
| 7 | Two layers of `fetch` rewriting (injected wrapper + string-patched `const r=await fetch(u,o);`). | Fragile; any change on the PC page silently breaks it. |

## What this branch already did (`fix/restore-direct-order-page`)

- `src/api.ts`: removed the whole proxy (`/live-order`, `/order`, `/order/*`, `/order-api/*`, `/api/order/*`, …). Cashfree webhook and `/api/worker/*` are untouched.
- `src/components/LiveOrder.tsx`: iframe and "open full screen" link go directly to `https://order.saubhagya.net/order` again (exactly as on 26.09).
- Added `docs/order-page-wording.worker.js` (see Task 2).
- **Kept:** all wording, pricing, About/Terms/Privacy, brand-name, software-toggle (admin → Payment Settings) changes.
- Checked: `npx tsc --noEmit` passes, `vite build` (Vercel preset) passes.

## Rules

1. Do **not** put any server, proxy, rewrite or `replaceAll` between the browser and
   `order.saubhagya.net`. The order page must be opened directly.
2. Wording may only be changed in **visible text**. Never in JS, URLs, API values, option values or form values.
3. No force-push / rebase / amend (Lovable sync). Normal commits only.
4. Do not touch Supabase SQL (already applied by the owner).

## Task 1 — merge the fix and deploy

```bash
git fetch origin
git checkout main && git pull
git merge --no-ff origin/fix/restore-direct-order-page -m "Fix: restore direct order page, remove Vercel order proxy"
npx tsc --noEmit && npm run build
git push origin main
```

Then test on saubhagya.net (hard refresh): home → order tab loads → pick area → design →
submit → order number `VS####` appears → status page polls → PDF/QR download works →
"↺ शुरू से" works. Also open `https://order.saubhagya.net/order` directly: same behaviour.

## Task 2 — wording on the order page, done at the source (Cloudflare Worker)

The order page text still says "वोटर पर्ची", "पंचायत चुनाव", "प्रत्याशी"… and
`order.saubhagya.net` is what a PhonePe reviewer will open. Change it **where the page is
served**:

- Option A (best): in the PC app's order page template (`_SLIP_APP`, the HTML/JS of `/order`),
  change only visible labels. Search for `वोटर`, `मतदाता`, `चुनाव`, `मतदान`, `प्रत्याशी`,
  `नमूना — मुफ़्त`. Do **not** rename JSON keys, `data-kind` values, API paths or values sent to the server.
  Rename "नमूना — मुफ़्त" to "नमूना — मुफ़्त(Sample-Free)".
- Option B (if the PC code is not at hand): use the Worker that already serves
  `order.saubhagya.net` (the snapshot Worker). Wrap its handler with
  `docs/order-page-wording.worker.js`. It injects a text-only scrubber
  (tested: input values, textareas, scripts and dynamic data are not changed) and hides the
  software cards unless the Worker variable `SHOW_SOFTWARE=1`. API calls, uploads, PDFs and
  QR images pass through untouched, so nothing can break orders.
  Deploy with `wrangler deploy` (or paste in the Cloudflare dashboard → Workers → Edit code).

Ask the owner first which option applies. Do not guess.

## Task 3 — verify the pipeline end to end

- [ ] Website home → order → place an order → gets `VS####` → appears in the PC register (`ऑर्डर रजिस्टर (PC)` button in /admin).
- [ ] Banner photo upload (design A) works.
- [ ] PDF is created and the download link works.
- [ ] Two orders from different phones within a minute are both accepted (proves no shared-IP problem).
- [ ] `/software` shows "not available" and nav/footer link hidden while the admin toggle is off; turning it on shows them.
- [ ] Pages load: `/`, `/pricing`, `/about`, `/contact`, `/terms`, `/privacy`, `/refund`, `/shipping`, `/admin`.

## Known leftovers (do later, not now)

- The software toggle is stored as JSON inside `payment_config.phonepe_callback_url`. It works, but when the real
  PhonePe callback URL is needed, add a proper `software_enabled boolean` column via a new SQL file (owner runs it) and migrate.
- `package-lock.json` only has macOS native binaries; Vercel installs fine today, but Linux/Windows `npm ci` fails. Keep one lockfile.
