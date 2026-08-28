import { z } from "zod";

/** Normalized payment states. Kept separate from the order workflow status. */
export const PAYMENT_STATUSES = [
  "UNPAID",
  "VERIFICATION_PENDING",
  "PAID_VERIFIED",
  "SUSPICIOUS",
  "MANUAL_APPROVED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["MANUAL_QR", "PAYPUR_GATEWAY"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  VERIFICATION_PENDING: "Verification Pending",
  PAID_VERIFIED: "Paid (Ready to Process)",
  SUSPICIOUS: "Suspicious",
  MANUAL_APPROVED: "Manual Approved",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MANUAL_QR: "Manual QR",
  PAYPUR_GATEWAY: "PayPur Gateway",
};


/** Storage keys the anon upload policy permits for payment screenshots. */
export const SCREENSHOT_PATH_RE = /^screenshots\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/;
/** Storage keys used for admin-managed symbol icons. */
export const SYMBOL_PATH_RE = /^symbols\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/;
/** Storage key for the single payment QR image. */
export const QR_PATH_RE = /^qr\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/;

export const orderIdSchema = z.string().trim().min(1).max(40);

export const screenshotSchema = z.object({
  order_id: orderIdSchema,
  path: z.string().regex(SCREENSHOT_PATH_RE, "Invalid screenshot path"),
});

export const paypurStartSchema = z.object({ order_id: orderIdSchema });

export type PublicSymbol = {
  id: string;
  party_name: string;
  symbol_name: string;
  image_url: string | null;
};

export type PublicPaymentPanel = {
  display_name: string | null;
  upi_id: string | null;
  instructions: string | null;
  amount: number | null;
  qr_url: string | null;
  paypur_enabled: boolean;
};

export type AdminSymbol = {
  id: string;
  party_name: string;
  symbol_name: string;
  symbol_image_path: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminPaymentSettings = {
  display_name: string | null;
  upi_id: string | null;
  instructions: string | null;
  amount: number | null;
  qr_image_path: string | null;
  qr_url: string | null;
  paypur_enabled: boolean;
  paypur_base_url: string;
  paypur_amount: number | null;
  paypur_success_url: string | null;
  paypur_failure_url: string | null;
  /** Never the values themselves — only whether a secret is on file. */
  has_api_key: boolean;
  has_signing_secret: boolean;
};
