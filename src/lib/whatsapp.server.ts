/**
 * WhatsApp Business / AiSensy integration adapter.
 * Kept OFF by default (AISENSY_ENABLED=false) until Meta approval.
 * Note: Never use 9828555751 for automated APIs.
 */

export interface WhatsAppTemplatePayload {
  to: string;
  template: string;
  params?: Record<string, string>;
  mediaUrl?: string;
}

export function isWhatsAppAutomationEnabled(): boolean {
  return process.env["AISENSY_ENABLED"] === "true";
}

export async function sendTemplate(payload: WhatsAppTemplatePayload): Promise<{ success: boolean; id?: string }> {
  if (!isWhatsAppAutomationEnabled()) {
    console.log("[WhatsApp/AiSensy Disabled] Would have sent template:", payload.template, "to:", payload.to);
    return { success: true };
  }

  const apiKey = process.env["AISENSY_API_KEY"];
  if (!apiKey) {
    console.warn("[WhatsApp/AiSensy] AISENSY_API_KEY is not configured.");
    return { success: false };
  }

  try {
    const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        campaignName: payload.template,
        destination: payload.to.replace(/\D/g, ""),
        templateParams: payload.params ? Object.values(payload.params) : [],
        media: payload.mediaUrl ? { url: payload.mediaUrl } : undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[WhatsApp/AiSensy] Send failed:", res.status, errText);
      return { success: false };
    }

    const json = await res.json();
    return { success: true, id: json.id || json.messageId };
  } catch (err) {
    console.error("[WhatsApp/AiSensy] Network error:", err);
    return { success: false };
  }
}
