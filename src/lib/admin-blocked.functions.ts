import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { blockListSchema, blockActionSchema } from "./admin-blocked.schema";
import { assertSession } from "./admin.server";

export const adminListBlocked = createServerFn({ method: "POST" }).validator((d: unknown) => d).handler(async ({ data: payload }) => {
  const data = blockListSchema.parse(payload);
  const db = await assertSession(data.token);

  const { data: rows, error } = await (db as any)
    .from("blocked_entities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return rows;
});

export const adminBlockEntity = createServerFn({ method: "POST" }).validator((d: unknown) => d).handler(async ({ data: payload }) => {
  const data = blockActionSchema.parse(payload);
  const db = await assertSession(data.token);

  const isIp = data.type === "IP";
  const matchCol = isIp ? "ip_address" : "phone";

  // Upsert the block
  const { error } = await (db as any).from("blocked_entities").upsert({
    ...(isIp ? { ip_address: data.value } : { phone: data.value }),
    reason: data.reason ?? null,
    is_blocked: true,
    blocked_by: "ADMIN",
    updated_at: new Date().toISOString(),
  } as any, { onConflict: matchCol as any });

  if (error) throw new Error(error.message);
  return { success: true };
});

export const adminUnblockEntity = createServerFn({ method: "POST" }).validator((d: unknown) => d).handler(async ({ data: payload }) => {
  const data = blockActionSchema.parse(payload);
  const db = await assertSession(data.token);

  const matchCol = data.type === "IP" ? "ip_address" : "phone";

  const { error } = await (db as any)
    .from("blocked_entities")
    .update({ is_blocked: false, updated_at: new Date().toISOString() } as any)
    .eq(matchCol, data.value);

  if (error) throw new Error(error.message);
  return { success: true };
});
