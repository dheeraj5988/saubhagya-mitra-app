import { z } from "zod";

export const PAYMENT_STATUSES = [
  "Unpaid",
  "Payment Screenshot Received",
  "Payment Verified",
  "Payment Rejected",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

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
