import { createServerFn } from "@tanstack/react-start";
import { blockActionSchema, blockListSchema } from "./admin-blocked.schema";

export const adminListBlocked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => blockListSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: rows, error } = await (db as any)
      .from("blocked_entities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return rows;
  });

export const adminBlockEntity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => blockActionSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { error } = await (db as any)
      .from("blocked_entities")
      .insert({
        type: data.type,
        value: data.value,
        reason: data.reason ?? null,
      });

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminUnblockEntity = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => blockActionSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { error } = await (db as any)
      .from("blocked_entities")
      .delete()
      .match({ type: data.type, value: data.value });

    if (error) throw new Error(error.message);
    return { success: true };
  });
