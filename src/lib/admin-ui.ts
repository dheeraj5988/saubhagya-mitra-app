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

/** Badge colours mirror the dashboard system: purple visitor, orange abandoned, emerald submitted. */
export function leadTypeClass(type: string) {
  if (type === "submitted") return "border-success/30 bg-success/12 text-success";
  if (type === "abandoned") return "border-saffron/30 bg-saffron/12 text-saffron-deep";
  return "border-[oklch(0.55_0.2_300)]/30 bg-[oklch(0.55_0.2_300)]/12 text-[oklch(0.45_0.2_300)]";
}

export function leadStatusClass(status: string) {
  if (status === "Submitted") return "border-success/30 bg-success/12 text-success";
  if (status === "Partial") return "border-saffron/30 bg-saffron/12 text-saffron-deep";
  return "border-info/30 bg-info/12 text-info";
}

/** Local-day boundary hint for the server so date filters aren't read as UTC. */
export function localTzOffset() {
  return new Date().getTimezoneOffset();
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
