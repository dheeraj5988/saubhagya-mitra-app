import { timingSafeEqualStr, sha256 } from "./crypto.server";

export async function isPcRequest(request: Request): Promise<boolean> {
  const key = request.headers.get("x-pc-key") ?? "";
  const expected = process.env["PC_SYNC_KEY_SHA256"] ?? "";
  if (!key || expected.length !== 64) return false;
  return timingSafeEqualStr(await sha256(key), expected);
}
