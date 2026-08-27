import { createServerFn } from "@tanstack/react-start";

import {
  deleteSchema,
  loginSchema,
  photoSchema,
  statusSchema,
  tokenSchema,
  type AdminLead,
  type AdminOrder,
} from "./admin.schema";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const { constantTimeEqual, newToken, sha256 } = await import("./admin.server");
    const expected = process.env["ADMIN_PASSWORD"];
    const hint = process.env["ADMIN_PASSWORD_HINT"] ?? "";
    if (!expected) throw new Error("Admin password is not configured");

    if (!constantTimeEqual(data.password, expected)) {
      return { ok: false as const, hint };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = newToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("admin_sessions")
      .insert({ token_hash: await sha256(token), expires_at: expiresAt });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_sessions").delete().lt("expires_at", new Date().toISOString());

    return { ok: true as const, token, expires_at: expiresAt };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { sha256 } = await import("./admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_sessions").delete().eq("token_hash", await sha256(data.token));
    return { ok: true };
  });

export const adminDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);

    const [ordersRes, leadsRes] = await Promise.all([
      db.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("visitor_leads").select("*").order("visited_at", { ascending: false }).limit(500),
    ]);
    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (leadsRes.error) throw new Error(leadsRes.error.message);

    const paths = (ordersRes.data ?? []).map((o) => o.photo_path).filter(Boolean) as string[];
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await db.storage
        .from("candidate-photos")
        .createSignedUrls(paths, 60 * 60);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedMap.set(item.path, item.signedUrl);
      }
    }

    const orders: AdminOrder[] = (ordersRes.data ?? []).map((o) => ({
      ...(o as unknown as AdminOrder),
      photo_url: o.photo_path ? (signedMap.get(o.photo_path) ?? null) : null,
    }));

    return { orders, leads: (leadsRes.data ?? []) as unknown as AdminLead[] };
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { error } = await db
      .from("orders")
      .update({ status: data.status })
      .eq("order_id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { data: row } = await db
      .from("orders")
      .select("photo_path")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (row?.photo_path) {
      await db.storage.from("candidate-photos").remove([row.photo_path]);
    }
    const { error } = await db.from("orders").delete().eq("order_id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminPhotoUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => photoSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertSession } = await import("./admin.server");
    const db = await assertSession(data.token);
    const { data: signed, error } = await db.storage
      .from("candidate-photos")
      .createSignedUrl(data.path, 300, { download: true });
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
