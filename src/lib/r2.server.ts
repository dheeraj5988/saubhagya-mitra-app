import { AwsClient } from 'aws4fetch';

function getAwsClient() {
  return new AwsClient({
    accessKeyId: process.env["R2_ACCESS_KEY_ID"] || "",
    secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"] || "",
    service: 's3',
    region: 'auto',
  });
}

/** Signed 24-hour download link (expiresIn default 86400 per B8). */
export async function generateDownloadUrl(key: string, expiresIn = 86400) {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  const aws = getAwsClient();
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  url.searchParams.set('X-Amz-Expires', expiresIn.toString());
  const signed = await aws.sign(url, { method: 'GET', aws: { signQuery: true } });
  return signed.url;
}

export async function generateUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  const aws = getAwsClient();
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  url.searchParams.set('X-Amz-Expires', expiresIn.toString());
  const signed = await aws.sign(url, { method: 'PUT', aws: { signQuery: true } });
  return signed.url;
}

export async function putObject(key: string, body: string | Uint8Array, contentType = "application/json") {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not configured");
  const aws = getAwsClient();
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const res = await aws.fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: body as any,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 putObject failed (${res.status}): ${errText}`);
  }
}

export async function getObject(key: string): Promise<string | null> {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  if (!accountId) return null;
  const aws = getAwsClient();
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  const res = await aws.fetch(url, { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 getObject failed (${res.status})`);
  return res.text();
}

export async function listObjects(prefix: string): Promise<string[]> {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  if (!accountId) return [];
  const aws = getAwsClient();
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
  const res = await aws.fetch(url, { method: "GET" });
  if (!res.ok) return [];
  const xml = await res.text();
  const keys: string[] = [];
  const regex = /<Key>([^<]+)<\/Key>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) keys.push(match[1]);
  }
  return keys;
}

export async function deleteObject(key: string): Promise<void> {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  if (!accountId) return;
  const aws = getAwsClient();
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  await aws.fetch(url, { method: "DELETE" });
}

export async function copyObject(sourceKey: string, destKey: string): Promise<void> {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const bucket = process.env["R2_BUCKET"] || "saubhagya-order-files";
  if (!accountId) return;
  const aws = getAwsClient();
  const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${destKey}`;
  const res = await aws.fetch(url, {
    method: "PUT",
    headers: {
      "x-amz-copy-source": encodeURIComponent(`/${bucket}/${sourceKey}`),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 copyObject failed (${res.status}): ${errText}`);
  }
}
