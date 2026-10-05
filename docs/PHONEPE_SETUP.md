# PhonePe setup (05.10.2026)

Keys live only in Vercel → Settings → Environment Variables. Never in git, the admin panel or chat.

| Name | Value |
|---|---|
| `PHONEPE_ENABLED` | `true` to switch on (anything else = off) |
| `PHONEPE_ENV` | `SANDBOX` for test keys, `PRODUCTION` for live keys |
| `PHONEPE_CLIENT_ID` | from PhonePe dashboard → Developer Settings |
| `PHONEPE_CLIENT_SECRET` | from PhonePe dashboard → Developer Settings |
| `PHONEPE_CLIENT_VERSION` | shown beside the keys (default `1`) |
| `PHONEPE_WEBHOOK_USERNAME` / `PHONEPE_WEBHOOK_PASSWORD` | optional; the same values typed in the PhonePe webhook form |
| `PC_SYNC_KEY_SHA256` | optional; sha256 of the PC app's private key (for the PC endpoints) |

Redeploy after changing any variable.

Webhook URL to enter in the PhonePe dashboard: `https://saubhagya.net/api/phonepe/webhook`
(events: `checkout.order.completed`, `checkout.order.failed`).

## What is wired

- Website backup form (Supabase orders): "Pay with PhonePe" button → PhonePe page → back to
  `/order/<id>?paid=1`, which asks PhonePe for the real status and marks the order PAID
  only if the amount matches.
- Webhook: re-checks every payment with PhonePe's Order Status API before recording it.
  All finished payments are stored in the `payment_events` table.

## PC order page (VS#### orders) — contract for the PC app

Header on every call: `X-PC-Key: <private key>`.

`POST https://saubhagya.net/api/pc/pay-link`
body `{"order_no":"VS1811","amount_paise":73254}` (optional `"redirect_url"` on saubhagya.net)
→ `{"merchant_order_id":"VS1811-xxxx","pay_url":"https://…","expires_in_seconds":1800}`
Show `pay_url` as a button/QR. Create a new link if it expires.

`GET https://saubhagya.net/api/pc/pay-status?merchant_order_id=VS1811-xxxx`
→ `{"state":"COMPLETED"|"PENDING"|"FAILED","amount_paise":73254,"order_no":"VS1811",…}`
Mark the order paid only when `state` is `COMPLETED` and `amount_paise` equals the order amount.
