import { AwsClient } from 'aws4fetch';

function getAwsClient() {
  return new AwsClient({
    accessKeyId: process.env["R2_ACCESS_KEY_ID"] || "",
    secretAccessKey: process.env["R2_SECRET_ACCESS_KEY"] || "",
    service: 's3',
    region: 'auto',
  });
}

export async function generateDownloadUrl(key: string, expiresIn = 604800) {
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
