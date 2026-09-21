import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminTokenSchema } from "./admin-catalog.schema";

const addWorkerSchema = adminTokenSchema.extend({
  name: z.string().min(1).max(50),
  workerToken: z.string().min(1),
});

const workerIdSchema = adminTokenSchema.extend({
  id: z.string().uuid(),
});

const toggleWorkerSchema = workerIdSchema.extend({
  active: z.boolean(),
});

export const addWorker = createServerFn({ method: "POST" })
  .validator((data: unknown) => addWorkerSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { data: worker, error } = await db
      .from("workers")
      .insert({
        name: data.name,
        token_hash: data.workerToken, // Store raw token securely in DB
        active: true,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return worker;
  });

export const deleteWorker = createServerFn({ method: "POST" })
  .validator((data: unknown) => workerIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { error } = await db.from("workers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleWorker = createServerFn({ method: "POST" })
  .validator((data: unknown) => toggleWorkerSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const { error } = await db
      .from("workers")
      .update({ active: data.active })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
