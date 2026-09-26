# Saubhagya PC Bridge API Contract (B9)

This document defines the REST API contract between the central web server (`saubhagya.net`, TanStack Start + Supabase) and the local PC desktop application (`order.saubhagya.net` / `data/orders.sqlite`).

---

## 1. Architecture Overview

- **Source of Truth:** The local PC desktop application (`data/orders.sqlite`) is the primary source of truth for manufacturing, queue management, operator assignment, and printing.
- **Web Fallback Mode:** When the customer visits `saubhagya.net` and submits an order directly through the web fallback form, the order is stored in Supabase with `source = 'web_fallback'`. If Supabase is unreachable, it is buffered into Cloudflare R2 (`fallback-orders/YYYY-MM-DD/<order_id>.json`).
- **Bridge Sync:** The PC desktop app periodically polls `saubhagya.net/api/pc/orders` to ingest new fallback orders, downloads high-resolution candidate photos & voter lists using temporary 1-hour signed URLs, and acknowledges receipt via `POST /api/pc/orders/ack`.

---

## 2. Authentication

All requests to `/api/pc/*` endpoints require the `X-PC-Key` header:

```http
X-PC-Key: <SHARED_SECRET_KEY>
```

On the server, this key is verified against `PC_SYNC_KEY_SHA256` using timing-safe comparison (`crypto.timingSafeEqual`). If invalid or missing, the server responds with:

```json
{
  "ok": false,
  "error": "Unauthorized"
}
```
HTTP Status: `401 Unauthorized`

---

## 3. Endpoints

### 3.1 Fetch Unsynced Orders
**`GET /api/pc/orders`**

Fetches all web orders that have not yet been synced to the PC database (`synced_to_pc_at IS NULL`).

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Maximum orders to return (1–100, default: 50). |
| `since` | string | No | Optional ISO-8601 timestamp filter. |

#### Response (`200 OK`)
```json
{
  "ok": true,
  "orders": [
    {
      "order_id": "SBG-K8M2X9",
      "candidate_name_hindi": "सुरेश कुमार शर्मा",
      "candidate_name_english": "",
      "contact_number": "9829012345",
      "district": "जयपुर",
      "panchayat_samiti": "सांगानेर",
      "gram_panchayat": "मुहाना",
      "ward_number": "5",
      "pad": "ward_panch",
      "booth_snapshots": [
        { "booth_number": "12", "booth_name": "राजकीय विद्यालय" }
      ],
      "design_code": "P-16",
      "election_symbol": "कलम दवात",
      "voter_count": 850,
      "amount": 2550,
      "photo_slip": true,
      "photo_url": "https://<supabase-url>/storage/v1/object/sign/candidate-photos/orders/...jpg?token=...",
      "voter_photo_pdf_url": "https://<supabase-url>/storage/v1/object/sign/candidate-photos/...pdf?token=...",
      "payment_status": "PAID",
      "payment_txn_id": "TXN_987654321",
      "created_at": "2026-09-26T10:15:00.000Z",
      "source": "web_fallback"
    }
  ]
}
```

*Note:* `photo_url` and `voter_photo_pdf_url` are presigned for **1 hour (3600 seconds)**. The PC app should download assets immediately upon retrieval.

---

### 3.2 Acknowledge Order Sync
**`POST /api/pc/orders/ack`**

Notifies the server that an order has been successfully recorded in the PC's local SQLite database.

#### Request Body
```json
{
  "order_id": "SBG-K8M2X9",
  "pc_order_no": "PC-2026-0042"
}
```

#### Response (`200 OK`)
```json
{
  "ok": true,
  "order_id": "SBG-K8M2X9",
  "synced_to_pc_at": "2026-09-26T10:16:30.123Z"
}
```

#### Server Actions
1. Sets `synced_to_pc_at = NOW()` and `pc_order_no = "PC-2026-0042"` in Supabase `orders` table.
2. If the order was buffered in R2 (`fallback-orders/YYYY-MM-DD/SBG-K8M2X9.json`), moves the file to `fallback-orders-done/` and deletes the buffer copy.

---

### 3.3 Fetch Online Payments
**`GET /api/pc/payments`**

Fetches confirmed payment events captured on the web (e.g., via PhonePe or Cashfree webhooks) that have not yet been acknowledged by the PC.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | string | No | Optional ISO timestamp filter. |

#### Response (`200 OK`)
```json
{
  "ok": true,
  "payments": [
    {
      "id": "pay_evt_123456",
      "order_id": "SBG-K8M2X9",
      "gateway": "phonepe",
      "event_type": "PAYMENT_SUCCESS",
      "amount": 2550,
      "txn_id": "T260926101500001",
      "created_at": "2026-09-26T10:15:30.000Z"
    }
  ]
}
```

---

### 3.4 Acknowledge Payment Sync
**`POST /api/pc/payments/ack`**

Acknowledges that the payment event has been reconciled into the local PC database.

#### Request Body
```json
{
  "event_id": "pay_evt_123456"
}
```

#### Response (`200 OK`)
```json
{
  "ok": true
}
```

---

### 3.5 Generate On-Demand Payment Link
**`POST /api/pc/pay-link`**

Allows the PC desktop operator to generate an online payment link (PhonePe / Cashfree) for custom orders, phone orders, or orders requiring balance settlement.

#### Request Body
```json
{
  "order_id": "SBG-K8M2X9",
  "amount": 2550,
  "phone": "9829012345"
}
```

#### Response (`200 OK`)
```json
{
  "ok": true,
  "order_id": "SBG-K8M2X9",
  "payment_url": "https://mercury.phonepe.com/transact/pg?token=..."
}
```

---

## 4. Error Responses

All error responses return standard JSON:

```json
{
  "ok": false,
  "error": "Error description message"
}
```

Common status codes:
- `400 Bad Request` — Missing or malformed parameters.
- `401 Unauthorized` — Invalid or missing `X-PC-Key`.
- `404 Not Found` — Specified order or resource was not found.
- `500 Internal Server Error` — Server-side error processing request.
