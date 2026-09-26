import { sha256, timingSafeEqualStr } from "./crypto.server";

const HOSTS = {
  SANDBOX: {
    auth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pg: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
  PRODUCTION: {
    auth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pg: "https://api.phonepe.com/apis/pg",
  },
} as const;

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

export function isPhonePeEnabled(): boolean {
  return process.env["PHONEPE_ENABLED"] === "true";
}

function getEnvConfig() {
  const env = (process.env["PHONEPE_ENV"] || "SANDBOX").toUpperCase() as "SANDBOX" | "PRODUCTION";
  const hosts = HOSTS[env] || HOSTS.SANDBOX;
  const clientId = process.env["PHONEPE_CLIENT_ID"] || "";
  const clientSecret = process.env["PHONEPE_CLIENT_SECRET"] || "";
  const clientVersion = process.env["PHONEPE_CLIENT_VERSION"] || "1";
  return { env, hosts, clientId, clientSecret, clientVersion };
}

export async function getPhonePeToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const { hosts, clientId, clientSecret, clientVersion } = getEnvConfig();
  if (!clientId || !clientSecret) {
    throw new Error("PhonePe client credentials are not configured");
  }

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_version", clientVersion);
  params.set("client_secret", clientSecret);
  params.set("grant_type", "client_credentials");

  const res = await fetch(hosts.auth, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PhonePe auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const accessToken = data.access_token as string;
  // expires_at can be a unix epoch timestamp in seconds or milliseconds, or expires_in in seconds
  let expiresAtMs = Date.now() + 3600_000;
  if (typeof data.expires_at === "number") {
    expiresAtMs = data.expires_at > 1e11 ? data.expires_at : data.expires_at * 1000;
  } else if (typeof data.expires_in === "number") {
    expiresAtMs = Date.now() + data.expires_in * 1000;
  }

  cachedToken = { accessToken, expiresAtMs };
  return accessToken;
}

export async function createPhonePePayment(params: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
}): Promise<{ orderId: string; state: string; redirectUrl: string }> {
  const { hosts } = getEnvConfig();
  const token = await getPhonePeToken();

  const payload = {
    merchantOrderId: params.merchantOrderId,
    amount: params.amountPaise,
    expireAfter: 1200, // 20 minutes
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: {
        redirectUrl: params.redirectUrl,
      },
    },
  };

  const res = await fetch(`${hosts.pg}/checkout/v2/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PhonePe initiate payment failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    orderId: (data.orderId || data.data?.orderId) as string,
    state: (data.state || data.data?.state || "PENDING") as string,
    redirectUrl: (data.redirectUrl || data.data?.redirectUrl) as string,
  };
}

export async function checkPhonePeOrderStatus(merchantOrderId: string): Promise<{
  orderId: string;
  state: string;
  amount?: number | undefined;
}> {
  const { hosts } = getEnvConfig();
  const token = await getPhonePeToken();

  const res = await fetch(`${hosts.pg}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false`, {
    method: "GET",
    headers: {
      Authorization: `O-Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PhonePe order status check failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    orderId: (data.orderId || data.data?.orderId || merchantOrderId) as string,
    state: (data.state || data.data?.state || "PENDING") as string,
    amount: (data.amount ?? data.data?.amount) as number | undefined,
  };
}

export async function verifyPhonePeWebhook(authHeader: string | null): Promise<boolean> {
  const user = process.env["PHONEPE_WEBHOOK_USERNAME"] || "";
  const pass = process.env["PHONEPE_WEBHOOK_PASSWORD"] || "";
  if (!authHeader || !user || !pass) return false;

  const expectedHash = await sha256(`${user}:${pass}`);
  return timingSafeEqualStr(authHeader.trim(), expectedHash);
}
