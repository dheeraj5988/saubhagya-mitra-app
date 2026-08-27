export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function assertSession(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256(token);
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("UNAUTHORIZED");
  }
  return supabaseAdmin;
}
