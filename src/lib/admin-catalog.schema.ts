import { z } from "zod";

import { PAYMENT_STATUSES, PHONEPE_ENVIRONMENTS, SYMBOL_PATH_RE } from "./catalog.schema";
import { SAMPLE_STATUSES } from "./orders.schema";

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
  bucket: z.literal("election-symbols"),
  kind: z.literal("symbol"),
  ext: z.enum(["jpg", "jpeg", "png", "webp"]),
});

/** Non-secret payment/pricing configuration. */
export const paymentConfigSchema = z.object({
  token,
  rate_per_voter: z.number().min(0).max(1000),
  min_order_amount: z.number().min(0).max(10_000_000).nullable().optional(),
  free_sample_voter_count: z.number().int().min(1).max(1000),
  phonepe_enabled: z.boolean().default(false),
  phonepe_environment: z.enum(PHONEPE_ENVIRONMENTS).default("SANDBOX"),
  phonepe_merchant_id: z.string().trim().max(120).nullable().optional(),
  phonepe_client_id: z.string().trim().max(200).nullable().optional(),
  phonepe_redirect_url: z.string().trim().url().max(300).nullable().optional(),
  phonepe_callback_url: z.string().trim().max(500).nullable().optional(),
  cashfree_enabled: z.boolean().default(false),
  cashfree_env: z.string().nullable().optional(),
  cashfree_app_id: z.string().nullable().optional(),
  software_enabled: z.boolean().default(false).optional(),
});

/** Secrets are write-only: they go in and are never read back to a browser. */
export const phonepeSecretsSchema = z.object({
  token,
  client_secret: z.string().trim().min(1).max(400).nullable().optional(),
  salt_key: z.string().trim().min(1).max(400).nullable().optional(),
  salt_index: z.string().trim().min(1).max(20).nullable().optional(),
  cashfree_secret_key: z.string().nullable().optional(),
});

export const paymentStatusSchema = z.object({
  token,
  order_id: z.string().trim().min(1).max(40),
  payment_status: z.enum(PAYMENT_STATUSES),
});

export const sampleStatusSchema = z.object({
  token,
  id: z.string().uuid(),
  status: z.enum(SAMPLE_STATUSES),
});

export const sampleQuerySchema = z.object({
  token,
  search: z.string().max(120).default(""),
  page: z.number().int().min(1).max(10_000).default(1),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const leadIdSchema = z.object({ token, id: z.string().uuid() });
export const clearLeadsSchema = z.object({ token, confirm: z.literal("DELETE") });
