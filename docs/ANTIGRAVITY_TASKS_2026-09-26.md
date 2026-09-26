<USER_REQUEST>
# Saubhagya — Antigravity work order (26.09.2026)

Repo: `saubhagya-mitra-app` (TanStack Start + Supabase, deployed on Vercel at `saubhagya.net`, synced with Lovable).
Source documents: "काम कैसे चलता है — v4 (25.09.2026)" and "अब क्या-क्या करना बाकी है — v4 (25.09.2026)".

Read this whole file before touching code. Work phase by phase, run the checks at the end of each phase, and commit after each phase.

---

## 0. Ground rules (do not break these)

1. **Do not delete any feature, table, route, tab or file.** Fix it, or switch it off behind a flag. The owner wants everything kept.
2. **Do not rename "voter / वोटर / मतदाता" text anywhere.** Wording changes are a separate owner decision. Leave all copy as it is.
3. **Do not change any phone number, legal name, Udyam number or address** in `src/lib/business.ts`. (Owner must confirm which WhatsApp number is public — see §11.)
4. **The number 9828555751 must never be connected to any API, bot or scraper** (PDF-1 §10).
5. **No secrets in code, commits or chat.** Secrets go in Vercel → Settings → Environment Variables and in a local `.env` (git-ignored).
6. **This repo is connected to Lovable** (`AGENTS.md`): never force-push, never rebase/amend/squash pushed commits. Normal commits + normal push only.
7. Hindi-first UI. Every new user-facing string needs `hi` and `en`.
8. Keep `npx tsc --noEmit` and `npm run build` green after every phase.

---

## 1. How the system actually works (read this — it explains the bugs)

Per PDF-1 (v4), the **main PC is the source of truth**:

- `order.saubhagya.net` is served **from the main PC** through Cloudflare Tunnel. Orders are stored on the PC in `data/orders.sqlite` + `out/ऑर्डर_रजिस्टर.xlsx`, numbered `VS####`.
- When the PC is off, a **Cloudflare Worker** serves a snapshot of the order page and queues orders in **R2**; the PC imports them within 30 s after it starts (`W-` codes → `VS####`).
- Kaarigar PCs (worker PCs) take jobs **from the main PC** via `X-Worker-Key` (PDF-1 §3क). This is already done (B16).

This repo (`saubhagya.net`) only does three things for orders:

1. `src/components/LiveOrder.tsx` probes `https://order.saubhagya.net/symbols/p01.png`. If it loads → iframe of the PC order page. If not (6 s timeout) → it shows the **old Supabase `OrderForm`**.
2. Orders from that fallback `OrderForm` are written to **Supabase**, and **nothing ever moves them to the PC register**. That is pending item **B9** in PDF-2. To the owner, these orders look "lost".
3. A second, parallel web-queue (`workers` table + `/api/worker/*` in `src/api.ts` + admin "Processing & PCs" tab) exists in this repo. It overlaps the PC's own kaarigar system and is half-broken (see §2).

**Target after this work order:**
- Fallback orders always save (Supabase, and R2 as last resort), and the PC pulls them into its register (B9).
- Payments via **PhonePe PG v2** land on Vercel (always on) and the PC pulls them (B7). Cashfree code stays but is disabled and hardened.
- The web-queue stays in the code but is **OFF by default** (`payment_config.web_worker_queue_enabled = false`).

---

## 2. Bugs found in the audit (all must be fixed)

| # | Where | Problem | Effect |
|---|---|---|---|
| 1 | `supabase/migrations/20260921100000_pad_booths.sql` and `20260921100000_worker_system_and_triggers.sql` | **Same version number twice.** `supabase db push` records versions in `schema_migrations`; the second file is skipped or fails. | `workers` table, `processing_status`, `output_files`, `claim_next_order`, the auto-queue trigger were most likely **never created** in production. |
| 2 | `src/routes/order/$orderId.tsx` | Selects `processing_status`, `output_files`. | Order-tracking page errors "Order not found" if bug #1 is true. |
| 3 | `src/api.ts` `/api/worker/complete` | Writes `processed_at` — **no migration creates it**. | Update fails every time; order never becomes "ready". |
| 4 | `src/api.ts` `/api/worker/fail` | Reads `attempts`, writes `processing_error` — **no migration creates them**. | Fail/retry never works. |
| 5 | `src/api.ts` | Calls RPC `increment_jobs_done` — **does not exist**. | Silent error. |
| 6 | `src/api.ts` Cashfree webhook | Writes `payment_intent_id` — **no migration creates it**. | Payment never marked PAID. |
| 7 | `src/api.ts` Cashfree webhook | **No signature verification.** Anyone can POST `{type:"PAYMENT_SUCCESS_WEBHOOK", data:{order:{order_id:"SBG-1234"}}}`. | **Critical:** fake "PAID" for any order. |
| 8 | `payment_config` / `payment_credentials` | Code reads `cashfree_enabled`, `cashfree_env`, `cashfree_app_id`, `cashfree_secret_key` — **no migration creates them** (only hand-edited into `types.ts`). | `getPublicPaymentConfig` and the admin payments tab error. |
| 9 | `OrderForm.tsx` photo-slip (Ph) upload | Browser uploads to bucket `voter-raw-lists`, but its only policy is `TO service_role`. | **Every Ph order fails** with an RLS error; the whole order is aborted. |
| 10 | `OrderForm.tsx` banner upload | Browser Supabase client needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` at build time; bucket `candidate-photos` is not created by any migration. | Banner orders (SR/SL/AT/AL/AR) fail if either is missing. |
| 11 | Migration `20260921100000_worker_system_and_triggers.sql` | `CREATE POLICY ... ON workers USING (true) WITH CHECK (true)` has **no `TO` role** → applies to `anon`. | Anyone with the public key can read worker tokens (stored in plain text). |
| 12 | `worker-management.functions.ts` + `api.ts` | Worker token stored and compared **in plain text**. | Leak = full worker takeover. PDF-1 says tokens are stored as sha256 only. |
| 13 | `$orderId.tsx` `getSignedUrls` | Public server fn signs **any R2 key** passed in; keys are predictable (`orders/SBG-1234/…`). | Anyone can download any customer's PDFs without the phone check. |
| 14 | `r2.server.ts` | Download links valid **7 days**. | PDF-1/PDF-2 (B8) require **24-hour** links. |
| 15 | `orders.schema.ts` `makeOrderId` | `SBG-` + 4 digits = only 10,000 IDs; time-based → collisions and guessable. | Retries, easy enumeration. |
| 16 | `$orderId.tsx` | Top-level `import { supabaseAdmin }` / `generateDownloadUrl` in a **route file** (ships to client bundle). `client.server.ts` itself warns against this. | Fragile; move to dynamic imports inside handlers. |
| 17 | `api.ts` `/api/worker/upload-urls` | Does not check the order is assigned to that worker. | A worker can overwrite any order's files. |
| 18 | `createOrder` | Fallback form has none of the PDF-1 §5क anti-bot rules (honeypot, 6-second rule, 3 per IP per minute, hold after 5 unpaid). | Spam orders. |
| 19 | `createOrder` | If Supabase is down/paused, the order is simply lost; the customer only sees a generic toast. | Lost orders. |
| 20 | `LiveOrder.tsx` | Falls back to the Supabase form whenever the probe image fails, **even when the Cloudflare Worker snapshot + R2 queue would have worked**. | Orders bypass the PC path (this is why B9 matters). |
| 21 | `package-lock.json` | Contains only `darwin-arm64` native binaries (`lightningcss`, `@tailwindcss/oxide`, `@rolldown/binding`). `npm ci` on Linux/Windows cannot build. `bun.lock` also exists. | Local/CI build failures; two lockfiles fight. |
| 22 | `.gitignore` | `.env*` at the end overrides `!.env.example`. | New env example edits may be ignored for new clones. |
| 23 | `.env.example` | Missing `R2_*`, `VITE_APP_URL`, PhonePe, PC sync, health, cron keys. | Deploys miss variables. |
| 24 | `adminTriggerTestJob` | Uses `design_code: "D2"` (old code). | Test job sends an unknown template to the EXE. Use `"P-16"`. |

Verified during the audit: `npx tsc --noEmit` passes and `vite build` with the Vercel preset succeeds (after adding the Linux native binaries). So the problems above are **runtime / database / config**, not compile errors.

---

## 3. Phase 0 — Diagnose first (30 min)

### 3.1 Add `GET /api/health` (protected)

In `src/api.ts` → `handleApiRoutes`, add before the worker block:

```ts
if (request.method === "GET" && path === "/api/health") {
  const key = url.searchParams.get("key") ?? "";
  if (!process.env["HEALTH_KEY"] || key !== process.env["HEALTH_KEY"]) {
    return new Response("Not found", { status: 404 });
  }
  const envNames = [
    "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY",
    "ADMIN_PASSWORD", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET",
    "PC_SYNC_KEY_SHA256", "PHONEPE_CLIENT_ID", "PHONEPE_WEBHOOK_USERNAME",
  ];
  const env = Object.fromEntries(envNames.map((n) => [n, Boolean(process.env[n])]));
  let db: unknown = null, dbError: string | null = null;
  try {
    const { data, error } = await (supabaseAdmin as any).rpc("schema_health");
    if (error) dbError = `${error.code ?? ""} ${error.message}`; else db = data;
  } catch (e: any) { dbError = e?.message ?? String(e); }
  const required = ["processing_status","output_files","attempts","processing_error","processed_at",
    "payment_intent_id","payment_gateway_order_id","source","synced_to_pc_at","pc_order_no","hold_reason",
    "pad","booth_ids","booth_snapshots"];
  const cols: string[] = (db as any)?.orders_columns ?? [];
  return Response.json({
    env, dbReachable: !dbError, dbError,
    missingOrderColumns: required.filter((c) => !cols.includes(c)),
    counts: db && { districts: (db as any).districts, wards: (db as any).wards,
      orders_total: (db as any).orders_total, orders_last_24h: (db as any).orders_last_24h,
      orders_not_in_pc: (db as any).orders_not_in_pc },
  }, { headers: { "cache-control": "no-store" } });
}
```

`schema_health()` is created by the Phase 1 migration. Before the migration runs, the endpoint still answers with `dbError` — that itself tells us whether the DB is reachable (`PGRST202 function not found` = reachable, schema old; network/`Invalid API key`/timeout = env or paused project).

### 3.2 Report back to the owner, before continuing

Open `https://saubhagya.net/api/health?key=<HEALTH_KEY>` after deploy and write down:

- Any `env.* = false` → add it in Vercel and redeploy.
- `dbError` mentions fetch/timeout/`project paused` → owner must **restore the Supabase project** (Supabase dashboard → project → "Restore"; free projects pause after inactivity).
- `wards: 0` → the geography master data is empty; the fallback form cannot place any order until wards are imported (admin → Geography tab).

---

## 4. Phase 1 — Repair the database schema

### 4.1 Fix the duplicate migration version

1. `git mv supabase/migrations/20260921100000_worker_system_and_triggers.sql supabase/migrations/20260921100001_worker_system_and_triggers.sql`
2. Replace its content with a no-op (everything it did is now in the repair migration, idempotently):

```sql
-- Superseded by 20260926100000_repair_orders_pipeline.sql (idempotent).
-- Kept only so the migration history stays readable. Intentionally a no-op.
SELECT 1;
```

### 4.2 Add `supabase/migrations/20260926100000_repair_orders_pipeline.sql`

Use the file delivered with this work order (`20260926100000_repair_orders_pipeline.sql`) **exactly as is**. It was tested on PostgreSQL 16 against a replay of every existing migration, in both possible production states (worker migration applied / not applied), and run twice in a row without errors. What it does:

- Creates `workers` if missing; **drops the open policy**; revokes `anon`/`authenticated`.
- Adds every missing `orders` column the code uses: `processing_status, assigned_worker_id, output_files, attempts, processing_error, processing_started_at, processed_at, payment_intent_id, payment_gateway_order_id, source, synced_to_pc_at, pc_order_no, hold_reason` (+ `pad, booth_ids, booth_snapshots` if the pad migration never ran).
- Status check now allows `On Hold` and `Cancelled`; payment method allows `PHONEPE, CASHFREE, UPI_QR, MANUAL`.
- Marks existing test/sample rows `source='test'` so they are never pulled into the PC.
- Adds `payment_config.cashfree_enabled / cashfree_env / cashfree_app_id / phonepe_client_version / web_worker_queue_enabled` and `payment_credentials.cashfree_secret_key`.
- New table `payment_events` (gateway webhooks, pulled by the PC).
- Rewrites `claim_next_order` (search_path, stale-job requeue after 10 min, attempts++), creates `increment_jobs_done`, rewrites the auto-queue trigger so it only queues when `web_worker_queue_enabled = true`.
- Ensures private buckets `candidate-photos` and `voter-raw-lists` exist.
- Adds `schema_health()` for `/api/health`.

### 4.3 Apply it

The owner applies SQL through **Supabase dashboard → SQL Editor → paste → Run** (same as the 21.09 instructions). Apply **before** deploying the Phase 2+ code. If the Supabase CLI is linked, `supabase db push` also works now that the versions are unique.

### 4.4 Update `src/integrations/supabase/types.ts`

Prefer `npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`. If the CLI is not available, hand-add the new columns/tables to `Row/Insert/Update` so `tsc` stays green. Remove the `as any` casts on `supabaseAdmin` where the types now exist.

**Phase 1 check:** `/api/health` shows `missingOrderColumns: []` and `dbReachable: true`.

---

## 5. Phase 2 — Fallback orders must always save

### 5.1 Uploads through server-issued signed URLs (fixes bugs #9, #10)

New file `src/lib/uploads.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ticketSchema = z.object({
  kind: z.enum(["banner", "roll_pdf"]),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  size: z.number().int().positive(),
});

export const createUploadTicket = createServerFn({ method: "POST" })
  .validator((d: unknown) => ticketSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isPdf = data.kind === "roll_pdf";
    if (isPdf !== (data.contentType === "application/pdf")) throw new Error("Wrong file type");
    if (data.size > (isPdf ? 50 : 5) * 1024 * 1024) throw new Error("File too large");
    const bucket = isPdf ? "voter-raw-lists" : "candidate-photos";
    const ext = isPdf ? "pdf" : data.contentType === "image/png" ? "png" : "jpg";
    const path = `${isPdf ? "uploads" : "orders"}/${crypto.randomUUID()}.${ext}`;
    const { data: t, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { bucket, path, token: t.token };
  });
```

In `OrderForm.tsx` replace both direct `supabase.storage.from(...).upload(...)` calls with:

```ts
const ticket = await getTicket({ data: { kind, contentType: file.type, size: file.size } });
const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
if (error) throw new Error(error.message);
```

Keep the `photo_path` regex in `orders.schema.ts` (`orders/<uuid>.(jpg|jpeg|png)`) and add a matching regex for `voter_photo_pdf_path` (`^uploads/[0-9a-f-]{36}\.pdf$`). Do **not** add any anon INSERT storage policy.

### 5.2 New order code (fixes #15)

In `orders.schema.ts` replace `makeOrderId`:

```ts
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export function makeOrderId(_attempt = 0, prefix = "SBG") {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${s}`; // e.g. SBG-K7QM2X
}
```

The PC gives the real `VS####` number on import (B9) and keeps `SBG-…` in the नोट column, exactly like `W-` codes.

### 5.3 Anti-bot and hold rules in `createOrder` (fixes #18; PDF-1 §5क)

Add to `orderSchema`: `website: z.string().max(0).optional()` (honeypot, hidden input named `website`, `tabIndex=-1`, `autoComplete="off"`, visually hidden) and `form_started_at: z.number().int()` (ms timestamp set when the form mounts).

Order of checks at the top of the handler, all limits read from env with these defaults:

| Rule (PDF-1 §5क) | Implementation | Result |
|---|---|---|
| (b) honeypot filled | `data.website` non-empty | reject: "ऑर्डर नहीं बन सका" (no detail) |
| (b) form filled in < 6 s | `Date.now() - form_started_at < 6000` | reject, same message |
| (b) > 3 orders / IP / minute | count `orders` with same `ip_address` in last 60 s | reject: "कृपया 1 मिनट बाद फिर कोशिश कीजिए" |
| existing admin block | `blocked_entities.is_blocked = true` | reject (keep current behaviour) |
| (c) ≥ `PIPELINE_MAX_UNPAID` (5) unpaid orders for this phone/IP in 7 days | count `payment_status='PENDING'` | **save** with `status='On Hold'`, `hold_reason='[रोका — 5 बिना भुगतान]'` |
| (d) ≥ `PIPELINE_MAX_AWAITING` (3) unpaid orders older than 48 h for this phone/IP | count | **save** as On Hold, `hold_reason='[रोका — 3 पुराने बकाया]'`; show the customer the hold message |

Important: (c) and (d) **still save the order** (PDF: "नया ऑर्डर दर्ज होता है पर रोका"). Remove the current auto-upsert into `blocked_entities` for 48 h (it only flagged, never helped); keep the manual block list.

Sanitize the IP before using it in `.or(...)` filters: `ip.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45)`.

Set `source: "web_fallback"` on insert.

### 5.4 Never lose an order (fixes #19)

Wrap the insert loop. If Supabase fails for any reason other than `23505`:

1. Write the validated order JSON (plus server-computed amount / voter count if available, else `null`) to R2 at `fallback-orders/YYYY-MM-DD/<SBG-code>.json` using `aws4fetch` (add `putObject(key, body, contentType)` to `r2.server.ts`, same signing as `generateUploadUrl`).
2. Return `{ order_id, voter_count, amount, stored: "r2" }`.
3. Only if R2 also fails, throw `ORDER_STORE_FAILED`.

In `OrderForm.tsx`, on `ORDER_STORE_FAILED` (or any unknown error), show a card — not just a toast — with a **"WhatsApp पर ऑर्डर भेजें"** button that pre-fills every field the customer chose (reuse `buildWhatsAppUrl(payload)` from `src/lib/campaign.ts`), so the customer can still order by hand.

### 5.5 Success screen

After a successful fallback order show: the `SBG-…` code, voters, amount, and the line
"आपका ऑर्डर मिल गया। हमारा कंप्यूटर चालू होते ही आपको असली ऑर्डर नंबर (VS…) और भुगतान का QR WhatsApp पर मिलेगा।" / English equivalent.

**Phase 2 check:** place one P order, one banner (A) order with an image, one Ph order with a PDF, on a local dev server with `?fallback=1` (see §8.2). All three appear in Supabase `orders` with `source='web_fallback'`, files exist in the private buckets.

---

## 6. Phase 3 — Security fixes

### 6.1 Cashfree webhook — verify or reject (bug #7)

Cashfree stays **disabled** (`cashfree_enabled=false`) but the endpoint must be safe:

```ts
async function verifyCashfree(raw: string, ts: string | null, sig: string | null) {
  const secret = process.env["CASHFREE_SECRET_KEY"];
  if (!secret || !ts || !sig) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts + raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return timingSafeEqualStr(expected, sig);
}
```

Headers: `x-webhook-timestamp`, `x-webhook-signature`. Read the body once with `request.text()` and verify on that exact string.

Add one shared helper in `src/lib/crypto.server.ts` and use it everywhere a secret is compared (webhooks, PC key, worker token):

```ts
export function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export { sha256 } from "./admin.server"; // hex sha256 already implemented there
``` If invalid → `401`. Even when valid, re-fetch the order from Cashfree's Get Order API and check `order_amount` equals `orders.amount` before marking PAID. Write the event into `payment_events` (provider `CASHFREE`). The `payment_intent_id` column exists after Phase 1.

### 6.2 Download links (bugs #13, #14, #16)

- Delete the public `getSignedUrls` server fn. Sign the URLs **inside** `verifyAndGetLinks`, only after the phone matches, only for keys listed in that order's `output_files`, and only if each key starts with `orders/<order_id>/`.
- `generateDownloadUrl(key, expiresIn = 86400)` — 24 hours (B8).
- Add a simple attempt limit to `verifyAndGetLinks`: max 5 wrong phones per order per 10 min (store counters in `admin_login_attempts` with `client_key = sha256("order-verify:" + order_id + ip)`, reusing the existing helpers in `admin.server.ts`).
- Move `supabaseAdmin` and `generateDownloadUrl` imports in `$orderId.tsx` to `await import(...)` inside the handlers.

### 6.3 Worker tokens (bugs #11, #12, #17)

- `addWorker`: generate the token **server-side** (`newToken()` from `admin.server.ts`), store `token_hash = sha256(token)`, return the raw token **once** to the admin UI ("यह चाबी सिर्फ़ एक बार दिखेगी").
- `/api/worker/*`: look up the worker by `id`, compare `sha256(body.token)` to `token_hash` in constant time.
- Existing workers with plain tokens: on the first successful plain match, rewrite `token_hash` to the sha256 (one-time migration in code), then only accept hashes.
- `/api/worker/upload-urls` and `/complete`: require `orders.assigned_worker_id = workerId` for that `order_id`.
- `/api/worker/fail`: now works because `attempts` / `processing_error` exist; stop retrying at `attempts >= 3`.
- `adminTriggerTestJob`: `design_code: "P-16"`, `source: "test"`.

**Phase 3 check:** a forged POST to `/api/cashfree/webhook` returns 401 and changes nothing; `/order/<id>` never returns a link before the phone check.

---

## 7. Phase 4 — B9: bring fallback orders into the PC register

The PC already polls the R2 queue every 30 s. Give it one more source.

### 7.1 Auth helper (`src/lib/pc-auth.server.ts`)

```ts
export async function isPcRequest(request: Request) {
  const key = request.headers.get("x-pc-key") ?? "";
  const expected = process.env["PC_SYNC_KEY_SHA256"] ?? "";
  if (!key || expected.length !== 64) return false;
  return timingSafeEqualStr(await sha256(key), expected);
}
```

Owner generates a long random key on the PC, stores it in `_SLIP_APP\.env` as `SITE_SYNC_KEY=...`, and puts **only its sha256** in Vercel as `PC_SYNC_KEY_SHA256`.

### 7.2 Endpoints in `src/api.ts` (all return 401 without a valid key)

| Method + path | Does |
|---|---|
| `GET /api/pc/orders?since=<ISO>&limit=50` | Orders with `synced_to_pc_at IS NULL`, `source IN ('web_fallback','rep_portal')`, `is_sample = false`, `created_at >= since` (default `2026-09-20T00:00:00+05:30`). Include every column the PC needs (area, `ward_snapshots`, `booth_snapshots`, `pad`, `design_code`, candidate fields, `status`, `hold_reason`, `amount`, `voter_count`, `referral_code`) plus 1-hour signed URLs for `photo_path` and `voter_photo_pdf_path`. Also include R2 `fallback-orders/` JSON files not yet acked (list with S3 `ListObjectsV2`, `?list-type=2&prefix=fallback-orders/`). |
| `POST /api/pc/orders/ack` body `{items:[{order_id, pc_order_no}]}` | Sets `synced_to_pc_at = now()`, `pc_order_no`. For R2 items, move the object to `fallback-orders-done/` (copy + delete). Idempotent. |
| `GET /api/pc/payments` | Rows of `payment_events` with `verified = true AND consumed_by_pc_at IS NULL`. |
| `POST /api/pc/payments/ack` body `{ids:[...]}` | Sets `consumed_by_pc_at = now()`. |
| `POST /api/pc/pay-link` body `{pc_order_no, amount_paise, customer_phone}` | Phase 5. |

### 7.3 Admin panel

In the Orders tab add columns **Source**, **PC** (shows `pc_order_no` or "PC में बाकी"), **Hold reason**, and a filter "PC में नहीं पहुँचे". Remove nothing.

### 7.4 PC side (only if the `_SLIP_APP` code is available to you — it is NOT in this repo)

Add `site_bridge.py`, called from the same 30-second loop that imports the R2 queue:

1. `GET https://saubhagya.net/api/pc/orders` with header `X-PC-Key`.
2. For each order: skip if its `SBG-…` code already exists in `orders.sqlite` (idempotent). Otherwise create it through **the same function the R2-queue import uses**, so it gets `VS####`, the नोट column gets `SBG-…`, multi-area orders are split into a group (PDF-1 §4), the 25,000 auto-confirm rule and the hold rules apply unchanged.
3. `POST /api/pc/orders/ack` with `{order_id, pc_order_no}`.
4. Log each import to the desk log. Network errors → retry next loop, never crash the app.

If the PC code is not available, stop after 7.3 and write the exact endpoint contract into `docs/PC_BRIDGE_CONTRACT.md` for the PC-side change.

**Phase 4 check:** `curl -H "X-PC-Key: <key>" https://<preview>/api/pc/orders` lists the Phase 2 test orders; ack removes them from the next call.

---

## 8. Phase 5 — Order page probe (B15-related) and PhonePe (B7)

### 8.1 `LiveOrder.tsx` (bug #20)

- Probe twice (0 s and +3 s) before deciding; total timeout 8 s.
- Treat the Cloudflare **snapshot** as "live" too. If the Worker code is editable, make it answer `/ping.png` (1×1 PNG) in **both** live and snapshot mode and probe that; otherwise keep `symbols/p01.png`.
- Only when the Worker itself does not answer, show the Supabase `OrderForm`, with a small note "वैकल्पिक फ़ॉर्म".

### 8.2 Dev switch

`?fallback=1` forces the fallback form, **only** when `import.meta.env.DEV` is true.

### 8.3 PhonePe PG v2 (B7) — build now, keep OFF until KYC is approved

Official references (verify every field against these before coding):
- Auth: https://developer.phonepe.com/v1/reference/authorization-standard-checkout
- Create payment: https://developer.phonepe.com/v1/reference/initiate-payment-standard-checkout
- Order status: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status
- Webhook: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook

`src/lib/phonepe.server.ts` (plain `fetch`, no SDK, works on Vercel):

```ts
const HOSTS = {
  SANDBOX:    { auth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
                pg:   "https://api-preprod.phonepe.com/apis/pg-sandbox" },
  PRODUCTION: { auth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
                pg:   "https://api.phonepe.com/apis/pg" },
} as const;
// token: POST form-urlencoded client_id, client_version, client_secret, grant_type=client_credentials
//        → { access_token, expires_at }  (cache until expires_at - 60 s)
// pay:   POST {pg}/checkout/v2/pay   header Authorization: O-Bearer <token>
//        body { merchantOrderId, amount /*paise*/, expireAfter: 1200,
//               paymentFlow: { type: "PG_CHECKOUT", merchantUrls: { redirectUrl } } }
//        → { orderId, state, redirectUrl }
// status: GET {pg}/checkout/v2/order/{merchantOrderId}/status?details=false
// webhook: header Authorization === sha256hex(`${WEBHOOK_USERNAME}:${WEBHOOK_PASSWORD}`)
//          use `event` + `payload.state` (COMPLETED / FAILED); ignore `type`.
```

Flows:

1. **Fallback web orders:** after a successful fallback order, if `phonepe_enabled`, show "PhonePe से भुगतान कीजिए". Server fn creates `merchantOrderId = <SBG-code>-<base36 time>`, stores it in `orders.payment_gateway_order_id`, returns `redirectUrl`; browser redirects (same tab — PhonePe requires a referrer, no `noreferrer`).
2. **PC orders (VS####):** `POST /api/pc/pay-link` (PC key) creates the payment and returns `redirectUrl`; the PC puts it in the QR / WhatsApp message instead of (or next to) the UPI QR.
3. **Webhook** `POST /api/phonepe/webhook`: verify header → re-check with the Order Status API → compare amount → upsert into `payment_events` (`verified=true`). If it matches a Supabase order, set `payment_status='PAID'`, `payment_method='PHONEPE'`, `payment_updated_at`. PC picks up both via `/api/pc/payments` (then marks "भुगतान मिला" and makes the Bill of Supply automatically — PC side).
4. **Redirect page** `/order/$orderId?paid=1` calls Order Status (never trust the redirect alone).

Env: `PHONEPE_ENABLED=false`, `PHONEPE_ENV=SANDBOX`, `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, `PHONEPE_WEBHOOK_USERNAME`, `PHONEPE_WEBHOOK_PASSWORD`. Secrets **only** in env; the admin Payments tab shows presence flags and the enable toggle only.

Replace the Cashfree button in `OrderForm.tsx` with a generic "Pay online" block that uses PhonePe when enabled; keep the Cashfree code path reachable only if `cashfree_enabled` is true (default false).

**Phase 5 check (sandbox):** a ₹1 sandbox payment moves an order to PAID via webhook; a webhook with a wrong Authorization header returns 401.

---

## 9. Phase 6 — WhatsApp automation (B5, B6, B8-WhatsApp, B10) — prepare only

Blocked on owner item **A6 (AiSensy/Meta approval)**. Build the adapter, keep it OFF:

- `src/lib/whatsapp.server.ts` with `sendTemplate({ to, template, params, mediaUrl })` → AiSensy campaign API; `AISENSY_ENABLED=false` makes it a no-op that logs.
- Never use 9828555751 as the API number.
- B6 (inbound WhatsApp orders) and B10 (morning summary) belong on the **PC** (it has the register). Here: only a placeholder endpoint `POST /api/aisensy/webhook` that returns 200 and stores nothing until enabled. Document the contract in `docs/WHATSAPP_CONTRACT.md`.

---

## 10. Phase 7 — Config, lockfile, docs

1. **Lockfile (bug #21):** check the last Vercel build log for which installer ran ("bun install" or "npm install"). Keep **only** that lockfile. If npm: `rm -rf node_modules package-lock.json && npm install` on Windows/Linux, commit, and confirm `grep -c "linux-x64-gnu" package-lock.json` > 0. If bun: delete `package-lock.json`.
2. **`.gitignore` (bug #22):** remove the trailing `.env*` line (keep `.env`, `.env.*`, `!.env.example` in that order).
3. **`.env.example` (bug #23):** add, with empty values and one-line comments: `R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, VITE_APP_URL, HEALTH_KEY, PC_SYNC_KEY_SHA256, PIPELINE_MAX_UNPAID=5, PIPELINE_MAX_AWAITING=3, PHONEPE_ENABLED=false, PHONEPE_ENV=SANDBOX, PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET, PHONEPE_CLIENT_VERSION, PHONEPE_WEBHOOK_USERNAME, PHONEPE_WEBHOOK_PASSWORD, CASHFREE_ENV, CASHFREE_APP_ID, CASHFREE_SECRET_KEY, AISENSY_ENABLED=false, AISENSY_API_KEY`.
4. Move the old `ANTIGRAVITY_INSTRUCTIONS.md` (21.09) to `docs/archive/`. Put this file at `docs/ANTIGRAVITY_TASKS_2026-09-26.md`.
5. Admin "Processing & PCs" tab: add a banner "वेब-कतार बंद है — PDF मुख्य PC और कारीगर PC बनाते हैं (डेस्क)। सिर्फ़ टेस्ट के लिए चालू करें।" and a toggle bound to `payment_config.web_worker_queue_enabled`.

---

## 11. Owner questions — ask, do not guess

1. Public WhatsApp/phone: website shows **+91 99833 33119**; the PDFs say customer WhatsApp is **9828555751**. Which is correct for the website? (Do not change until answered.)
2. Which gateway will be approved first — PhonePe (A7)? Then Cashfree stays disabled.
3. Is the `_SLIP_APP` (PC) code in a git repo you can open? If not, deliver `docs/PC_BRIDGE_CONTRACT.md` instead of editing it.

---

## 12. Test checklist (all must pass before merging to `main`)

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes (or `bun run build` if bun is the installer)
- [ ] `/api/health?key=…` → `dbReachable: true`, `missingOrderColumns: []`, all required env `true`, `wards > 0`
- [ ] Fallback P order saves; A order with image saves; Ph order with PDF saves
- [ ] Honeypot filled → rejected; submit within 6 s → rejected; 4th order from one IP in a minute → rejected
- [ ] 6th unpaid order from same phone → saved as `On Hold` with hold_reason
- [ ] Supabase deliberately unreachable (wrong URL in local `.env`) → order JSON lands in R2 `fallback-orders/`; UI shows WhatsApp fallback only if R2 also fails
- [ ] `/api/pc/orders` without key → 401; with key → lists test orders; ack works; second call empty
- [ ] `/order/<id>`: wrong phone ×5 → locked 10 min; right phone → 24-hour links; no public signing endpoint left
- [ ] Forged Cashfree webhook → 401; forged PhonePe webhook → 401
- [ ] Worker test job still works end-to-end when `web_worker_queue_enabled` is true; nothing auto-queues when false
- [ ] Anonymous key cannot `select` from `workers` (Supabase SQL: `set role anon; select * from workers;` → permission denied)
- [ ] Pages still load: `/`, `/pricing`, `/software`, `/about`, `/contact`, `/terms`, `/privacy`, `/refund`, `/shipping`, `/admin`, `/r/<code>`
- [ ] Hindi/English toggle works on every new string

---

## 13. Apply and push

```bash
# 0. Start clean
git checkout main && git pull
git checkout -b fix/orders-pipeline-0926

# 1. Phase by phase: edit → check → commit
npx tsc --noEmit && npm run build
git add -A && git commit -m "Phase N: <short description>"

# 2. Push the branch → Vercel makes a Preview deployment
git push -u origin fix/orders-pipeline-0926
```

Before merging:
1. Owner runs `20260926100000_repair_orders_pipeline.sql` in Supabase SQL Editor (Phase 1).
2. Owner adds the new env vars in Vercel for **Preview and Production**.
3. Run the §12 checklist on the Preview URL.

Merge (no force, no rebase — Lovable sync):

```bash
git checkout main && git pull
git merge --no-ff fix/orders-pipeline-0926 -m "Orders pipeline repair + B9 + PhonePe (off) + security"
git push origin main
```

Vercel deploys `main` automatically. Re-open `/api/health` on production and place one real fallback order.

If the owner insists on pushing straight to `main`: same commits, but run §12 locally first and push one phase at a time so any break is easy to revert with `git revert <sha>` (never reset).

---

## 14. Out of scope (do not do)

- Any "voter/वोटर/मतदाता" wording change.
- Changes to prices/rates (`SERIES_RATES`, licence rates).
- Deleting Cashfree, the web-queue, or any admin tab.
- Connecting 9828555751 to anything automated.
- Owner-only items from PDF-2: A5 poll dates, A6 AiSensy, A7 KYC, A8 GST decision, A9 Zoho mail, A11 policy review, A19 kaarigar PC, A20 rep portal passwords.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-26T03:07:27+05:30.
</ADDITIONAL_METADATA>