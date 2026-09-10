import { createServerFn } from "@tanstack/react-start";

import type { PublicSymbol } from "./catalog.schema";

const SIGNED_TTL = 3600;

/**
 * Public catalog read. Only active entries and only display fields are exposed;
 * symbol icons are served through short-lived signed URLs from a private bucket.
 */
export const listActiveSymbols = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("election_symbols")
    .select("id, party_name, symbol_name, symbol_image_path")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("party_name", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const paths = rows.map((r) => r.symbol_image_path).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabaseAdmin.storage
      .from("election-symbols")
      .createSignedUrls(paths, SIGNED_TTL);
    for (const item of urls ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
    }
  }

  return {
    symbols: rows.map<PublicSymbol>((r) => ({
      id: r.id,
      party_name: r.party_name,
      symbol_name: r.symbol_name,
      image_url: r.symbol_image_path ? (signed.get(r.symbol_image_path) ?? null) : null,
    })),
  };
});
