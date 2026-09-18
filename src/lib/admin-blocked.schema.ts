import { z } from "zod";

export const blockListSchema = z.object({
  token: z.string(),
});

export const blockActionSchema = z.object({
  token: z.string(),
  type: z.enum(["IP", "PHONE"]),
  value: z.string(),
  reason: z.string().optional(),
});
