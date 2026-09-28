/**
 * Payment states used across the app. PhonePe is the only planned gateway;
 * manual QR / screenshot verification has been removed.
 */
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["PHONEPE"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PHONEPE: "PhonePe",
};

export const PHONEPE_ENVIRONMENTS = ["SANDBOX", "PRODUCTION"] as const;
export type PhonePeEnvironment = (typeof PHONEPE_ENVIRONMENTS)[number];

/** Storage keys used for admin-managed symbol icons. */
export const SYMBOL_PATH_RE = /^symbols\/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/;

export type PublicSymbol = {
  id: string;
  party_name: string;
  symbol_name: string;
  image_url: string | null;
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

/**
 * Admin-visible payment configuration. Secrets are never returned — only
 * whether one is currently on file.
 */
export type AdminPaymentConfig = {
  rate_per_voter: number;
  min_order_amount: number | null;
  free_sample_voter_count: number;
  phonepe_enabled: boolean;
  phonepe_environment: PhonePeEnvironment;
  phonepe_merchant_id: string | null;
  phonepe_client_id: string | null;
  phonepe_redirect_url: string | null;
  phonepe_callback_url: string | null;
  has_client_secret: boolean;
  has_salt_key: boolean;
  cashfree_enabled: boolean;
  cashfree_env: string | null;
  cashfree_app_id: string | null;
  has_cashfree_secret: boolean;
  software_enabled: boolean;
};
