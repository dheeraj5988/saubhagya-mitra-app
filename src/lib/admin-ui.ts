export const ADMIN_TOKEN_KEY = "sbg_admin_token";

/** A stored token is only ever a 64-char hex string; anything else is garbage. */
export function isTokenShaped(value: string | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Server functions surface auth failures as an UNAUTHORIZED error message. */
export function isUnauthorized(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("UNAUTHORIZED") || message.includes("Invalid session token");
}

export function waLink(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `https://wa.me/91${digits}` : null;
}

export function telLink(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `tel:+91${digits}` : null;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function leadTypeLabel(type: string) {
  if (type === "submitted") return "Submitted";
  if (type === "abandoned") return "Abandoned";
  return "Visitor";
}

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  // Prefix formula-leading cells so spreadsheets cannot execute exported text.
  const escape = (v: string | number | null) => {
    const raw = String(v ?? "");
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
