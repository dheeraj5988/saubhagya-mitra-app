# WhatsApp Automation Contract (B5, B6, B8, B10)

This document specifies the WhatsApp Business automation architecture and API contracts for the Saubhagya Voter Slip platform using AiSensy (Meta Business Solution Provider).

---

## 1. Status & Prerequisites

- **Implementation Status:** Prepared / Scaffolded. Kept **OFF** (`AISENSY_ENABLED=false`) until Meta business verification and template approvals are completed (Owner Item A6).
- **CRITICAL RESTRICTION:**
  > **The number 9828555751 is the owner's direct mobile line and must NEVER be connected to any bot, webhook, or automated API.**
  > A dedicated WhatsApp Business API phone number will be allocated for automated messaging.

---

## 2. Component Responsibility

| Feature | Description | Host System |
|---------|-------------|-------------|
| **B5** | Fallback order confirmation message with payment link | Web (`saubhagya.net`) |
| **B6** | Inbound WhatsApp order parser & conversational intake | PC Desktop (`_SLIP_APP`) |
| **B8** | Payment confirmation & receipt message | Web / PC Bridge |
| **B10**| Morning executive summary of pending & completed orders | PC Desktop (`_SLIP_APP`) |

The central register and order pipeline exist in the PC desktop application (`data/orders.sqlite`). Therefore, inbound intake (B6) and morning summaries (B10) are handled directly by the PC application.

---

## 3. Web Service Adapter (`src/lib/whatsapp.server.ts`)

The web server provides an outbound adapter interface:

```typescript
export interface WhatsAppTemplatePayload {
  to: string;                  // E.164 formatted phone number (e.g. +919829012345)
  template: string;            // Approved AiSensy campaign / template name
  params?: Record<string, string>; // Template variable mapping
  mediaUrl?: string;           // Optional URL to media header (PDF or image)
}

export async function sendTemplate(
  payload: WhatsAppTemplatePayload
): Promise<{ success: boolean; id?: string }>;
```

### Environment Configuration
```ini
AISENSY_ENABLED=false
AISENSY_API_KEY=your_aisensy_api_key_here
```

When `AISENSY_ENABLED=false`, all calls to `sendTemplate` are no-ops that log the intended payload without making external HTTP requests.

---

## 4. Planned Message Templates

### 4.1 Order Received (`order_received`)
Sent when a fallback web order is placed.
- **Variables:**
  - `{{1}}` - Candidate Name
  - `{{2}}` - Order ID (`SBG-XXXXXX`)
  - `{{3}}` - Voter Count
  - `{{4}}` - Amount (₹)
  - `{{5}}` - Payment Link (PhonePe / UPI)

### 4.2 Payment Confirmed (`payment_confirmed`)
Sent when a webhook confirms payment receipt.
- **Variables:**
  - `{{1}}` - Candidate Name
  - `{{2}}` - Order ID (`SBG-XXXXXX`)
  - `{{3}}` - Amount Paid (₹)
  - `{{4}}` - Payment Txn ID

### 4.3 Order Ready for Download (`order_ready`)
Sent when slips PDF generation is completed.
- **Variables:**
  - `{{1}}` - Candidate Name
  - `{{2}}` - Order ID (`SBG-XXXXXX`)
  - `{{3}}` - Verification / Download Link (`https://saubhagya.net/order/SBG-XXXXXX`)

---

## 5. Webhook Contract

### `POST /api/aisensy/webhook`
Receives delivery receipts (sent, delivered, read, failed) and incoming message notifications from AiSensy.

- Returns `200 OK` with `{ "ok": true }`.
- When `AISENSY_ENABLED=true`, delivery statuses will update message delivery tracking records.
