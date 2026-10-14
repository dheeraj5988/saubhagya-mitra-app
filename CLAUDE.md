# Saubhagya — project context for Claude Code

Read this fully before any task. Never put passwords, keys or tokens in this file, in commits
or in chat — they live only in the hosting dashboards.

@AGENTS.md

## The owner

- Dheeraj (GitHub `dheeraj5988`). Business: SAUBHAGYA, sole proprietorship, proprietor
  Preeti Sharma, Laxmangarh, Sikar, Rajasthan. Udyam UDYAM-RJ-30-0145497.
- Talks in Hinglish / Hindi / English. Reply in plain, simple language, step by step, with exact
  clicks for dashboards. He is not a developer; he often asks for a ready-to-paste prompt for
  Antigravity (another AI coding tool he uses on his Mac/PC).
- Wants things done end to end, but say clearly what was tested and what was not.

## What the business sells

Print-ready customised slip PDFs and lists for Rajasthan panchayat candidates (posts: पंच,
सरपंच, पंचायत समिति सदस्य, ज़िला परिषद सदस्य), plus a Windows software licence and data.
Rates (src/lib/pricing.ts): P 15 paise, A 16 paise, Ph 20 paise per slip; S series hidden.
Delivery is digital only (WhatsApp / download).

## The three systems (most confusion comes from mixing these up)

| Part | Where it runs | In this repo? |
|---|---|---|
| `saubhagya.net` — home, pricing, policies, `/admin`, PhonePe code, `/pay`, `/api/*` | **Cloudways** Node.js app (PM2, port 3000). Migrated from Vercel on 12.10.2026 | Yes |
| `order.saubhagya.net` — the REAL order page (`VS####` numbers, PDFs, QR, PhonePe for real orders) | Owner's **main PC** app `_SLIP_APP` (Python/HTML), published via **Cloudflare Tunnel**; a Cloudflare Worker serves a snapshot + R2 queue when the PC is off | **No** — never seen by Claude; ask the owner to upload/link files |
| DNS for saubhagya.net | Cloudflare (DNS only, grey cloud) | — |

- Real customer orders live on the PC (`data/orders.sqlite`, `out/ऑर्डर_रजिस्टर.xlsx`), NOT in
  Supabase. The `/admin` Orders tab only shows Supabase orders (backup form), so it can show 0.
  The admin header button "ऑर्डर रजिस्टर (PC)" opens the PC register.
- Supabase stores: visitor leads, backup-form orders, geography (districts/samitis/GPs/wards/booths),
  symbols, referrals, admin sessions, payment config, `payment_events`, `workers`.

## Stack

TanStack Start (React 19, Vite 8, nitro), Tailwind 4, shadcn/ui, Supabase (`@supabase/supabase-js`),
Cloudflare R2 via `aws4fetch`, zod. Originally generated with Lovable (`.lovable/`, AGENTS.md).

- `src/server.ts` → custom server entry; it calls `handleApiRoutes` in `src/api.ts` first
  (plain HTTP routes), then TanStack SSR.
- Server functions: `src/lib/*.functions.ts` (`createServerFn`). Server-only code: `*.server.ts`.
  Never import `client.server.ts` at top level of a route or `.functions.ts` file — use
  `await import(...)` inside handlers.
- Routes: `src/routes/` (`index`, `pricing`, `software`, `about`, `contact`, `terms`, `privacy`,
  `refund`, `shipping`, `admin`, `order/$orderId`, `r.$code`). `routeTree.gen.ts` is generated.
- Business identity in one place: `src/lib/business.ts`. Policy texts: `src/content/policies.ts`.

## Build, run, deploy

- `vite.config.ts` sets nitro `defaultPreset: "node-server"` → `npm run build` makes
  `.output/server/index.mjs`; `npm start` runs it (reads PORT/HOST, loads `.env` if present).
  Vercel builds still auto-detect the Vercel preset (VERCEL env). Lovable forces its own preset.
- **Cloudways auto-deploys every push to `main`** (build `npm install && npm run build`, PM2
  start, Node 24). So: only push working code; run `npx tsc --noEmit` and `npm run build` first.
- Check a deploy: `https://saubhagya.net/api/health` → yes/no per env var, Supabase project
  (`drnbupojhdduhtcmbtxf`), table reachability. Never prints values.
- `package-lock.json` historically had only macOS native binaries; on Linux you may need
  `npm install` (not `npm ci`). Known pre-existing tsc errors in `src/components/HowToUse.tsx`
  (line ~116, `c` possibly undefined) — build still passes.
- `inputValidator()` deprecation warnings in the build log are harmless.

## Environment variables (names only — values are in Cloudways → Environment Variables)

SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL,
VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID, ADMIN_PASSWORD, ADMIN_PASSWORD_HINT,
SITE_URL, VITE_APP_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
PHONEPE_ENABLED, PHONEPE_ENV, PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_CLIENT_VERSION,
PHONEPE_WEBHOOK_USERNAME, PHONEPE_WEBHOOK_PASSWORD, PC_SYNC_KEY_SHA256 (optional), PORT, HOST.
`VITE_*` are baked in at build time → rebuild after changing them. See `.env.example`.

## PhonePe (Standard Checkout v2)

- Code: `src/lib/phonepe.server.ts` (token, pay, status, webhook auth, settle). Keys ONLY from env.
- `/api/phonepe/webhook` (dashboard events: checkout.order.completed / failed, SHA auth with the
  webhook username/password). Always re-checks with PhonePe Order Status before marking paid.
- `/api/pc/pay-link`, `/api/pc/pay-status` — for the PC app, header `X-PC-Key`
  (sha256 in PC_SYNC_KEY_SHA256). Contract in `docs/PHONEPE_SETUP.md`.
- Backup order form has "Pay with PhonePe"; return page `/order/<id>?paid=1` confirms status.
- PhonePe only accepts checkouts opened from the approved site `saubhagya.net`
  ("URL not the same as the one approved during onboarding"). `/pay?u=<phonepe url>&o=<order>`
  (`src/lib/pay-page.ts`) is a hand-off page on saubhagya.net; the owner also added
  `public/pg-go.html`. The PC order page must open PhonePe via saubhagya.net. A support request
  to whitelist `order.saubhagya.net` was drafted for the owner.
- The admin panel's PhonePe fields are no longer used (keys come from env).

## Admin

- `/admin` (desktop only), password from ADMIN_PASSWORD, 5 failures → 15 min lock.
- Login errors starting with "SETUP:" are shown as-is (missing env / database problem).
- Payment Settings → "सॉफ़्टवेयर सेक्शन" switch (`software_enabled`, stored as JSON inside
  `payment_config.phonepe_callback_url` — a hack; a proper column is a TODO). It shows/hides the
  software + data cards on the home page, `/software`, nav/footer, and (via `/api/site-flags`)
  on the order page Worker. Turn it OFF during PhonePe reviews.

## Rules (learned the hard way)

1. **Never proxy, rewrite or `replaceAll` the PC order page through saubhagya.net.** A Vercel
   reverse proxy (commits 3eaab8f..11169bb, 28–29.09) broke all orders; removed in 9fea061.
   Wording on the order page may only be changed in visible text (Cloudflare Worker snippet
   `docs/order-page-wording.worker.js`, or the PC app itself).
2. No force-push / rebase / amend of pushed commits (Lovable sync, see AGENTS.md).
3. Don't change phone numbers, legal name, Udyam, address or prices unless the owner asks.
   Public WhatsApp/phone on the site: +91 99833 33119. The number 9828555751 must never be
   connected to any API/bot.
4. "Voter / वोटर / मतदाता / चुनाव" wording was removed from the public site for PhonePe approval;
   don't reintroduce it on public pages unless asked (the 06.10 home page cards by the owner do
   use "वोटर पर्ची PDF" — that was his choice).
5. Secrets: never commit; keys were shared in chat/WhatsApp on 12.10 → rotation pending.
6. Before claiming something works on the live site, verify (e.g. `/api/health`) or say it's untested.

## Database notes

- Supabase project `drnbupojhdduhtcmbtxf` ("saubhagya-db"). `supabase/config.toml` still names an
  older Lovable project — ignore it.
- The owner runs SQL himself in Supabase → SQL Editor. Write new SQL as a migration file and hand
  it over; don't assume it ran. A repair migration (`20260926100000_repair_orders_pipeline.sql`:
  workers hardening, processing columns, payment_events, schema_health, cashfree columns) WAS run
  in the dashboard but is not in the repo (two migrations share version 20260921100000).
- Tables of note: orders, visitor_leads, geo_*, geo_booths, election_symbols, payment_config,
  payment_credentials, payment_events, referral_*, sample_requests, blocked_entities, workers,
  admin_sessions, admin_login_attempts, order_lookup_attempts, ward_photo_data_registry.

## Open items / ideas

- Rotate exposed keys (Supabase secret, R2 token, Cloudflare `cfat_` token, admin password,
  PhonePe webhook password) and update Cloudways env.
- PC order page: open PhonePe via `https://saubhagya.net/pay?...` (needs `_SLIP_APP` code), or get
  PhonePe to whitelist `order.saubhagya.net`.
- Proper `software_enabled` column instead of the JSON-in-callback-url hack.
- Fix HowToUse.tsx type errors; review `npm audit` (4 high, 1 critical); one lockfile only
  (`bun.lock` and `package-lock.json` both exist).
- Older plans (PDF "अब क्या-क्या करना बाकी है" v4, 25.09): B9 PC↔website order sync, B5/B6/B10
  WhatsApp automation (AiSensy), B8 24-hour download links — not built.
