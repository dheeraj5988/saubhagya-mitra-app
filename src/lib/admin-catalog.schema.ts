import { z } from "zod";

import { PAYMENT_STATUSES, QR_PATH_RE, SCREENSHOT_PATH_RE, SYMBOL_PATH_RE } from "./catalog.schema";

const token = z.string().regex(/^[0-9a-f]{64}$/, "Invalid session token");

export const adminTokenSchema = z.object({ token });

export const symbolSaveSchema = z.object({
  token,
  id: z.string().uuid().nullable().optional(),
  party_name: z.string().trim().min(1).max(120),
  symbol_name: z.string().trim().min(1).max(120),
  symbol_image_path: z.string().regex(SYMBOL_PATH_RE).nullable().optional(),
  active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const symbolIdSchema = z.object({ token, id: z.string().uuid() });

export const uploadTargetSchema = z.object({
  token,
  bucket: z.enum(["election-symbols", "payment-assets"]),
  kind: z.enum(["symbol", "qr"]),
  ext: z.enum(["jpg", "jpeg", "png", "webp"]),
});

export const paymentSettingsSchema = z.object({
  token,
  display_name: z.string().trim().max(120).nullable().optional(),
  upi_id: z.string().trim().max(120).nullable().optional(),
  instructions: z.string().trim().max(1000).nullable().optional(),
  amount: z.number().min(0).max(10_000_000).nullable().optional(),
  qr_image_path: z.string().regex(QR_PATH_RE).nullable().optional(),
  paypur_enabled: z.boolean().default(false),
  paypur_base_url: z.string().trim().url().max(200).default("https://upi.paypur.in"),
  paypur_amount: z.number().min(0).max(10_000_000).nullable().optional(),
  paypur_success_url: z.string().trim().url().max(300).nullable().optional(),
  paypur_failure_url: z.string().trim().url().max(300).nullable().optional(),
});

export const paypurSecretsSchema = z.object({
  token,
  api_key: z.string().trim().min(1).max(300).nullable().optional(),
  signing_secret: z.string().trim().min(1).max(300).nullable().optional(),
});

export const paymentStatusSchema = z.object({
  token,
  order_id: z.string().trim().min(1).max(40),
  payment_status: z.enum(PAYMENT_STATUSES),
});

export const screenshotUrlSchema = z.object({
  token,
  path: z.string().regex(SCREENSHOT_PATH_RE),
  download: z.boolean().default(false),
});

export const leadIdSchema = z.object({ token, id: z.string().uuid() });
export const clearLeadsSchema = z.object({ token, confirm: z.literal("DELETE") });
