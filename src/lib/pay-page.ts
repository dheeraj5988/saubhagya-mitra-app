/**
 * Checkout hand-off page: https://saubhagya.net/pay?u=<PhonePe pay URL>&o=<order no>
 *
 * PhonePe only accepts payments that are opened from the website approved at
 * onboarding (saubhagya.net). Orders are placed on order.saubhagya.net, so the
 * last step — opening PhonePe — is done from this page on saubhagya.net.
 * The payment itself (amount, order) is created by the order system as before;
 * this page never creates or changes a payment.
 *
 * Safety: it only ever forwards to an https address on phonepe.com, so it
 * cannot be abused to send people to another site.
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Returns the PhonePe address if it is safe to forward to, otherwise null. */
export function safePhonePeUrl(raw: string | null): string | null {
  if (!raw || raw.length > 2000) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    if (host !== "phonepe.com" && !host.endsWith(".phonepe.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function shell(body: string) {
  return `<!doctype html>
<html lang="hi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>भुगतान | Saubhagya</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;background:#eef2fb;color:#10214a;display:grid;place-items:center;min-height:100vh}
.card{background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(16,33,74,.12);padding:28px 24px;max-width:420px;width:calc(100% - 32px);text-align:center}
img{width:56px;height:56px;border-radius:12px}
h1{font-size:20px;margin:12px 0 4px}
p{margin:6px 0;color:#475569;font-size:14.5px;line-height:1.5}
.o{font-weight:700;color:#10214a}
a.btn{display:block;margin-top:18px;padding:14px 16px;border-radius:10px;background:#5f259f;color:#fff;font-weight:700;font-size:16px;text-decoration:none}
a.link{display:inline-block;margin-top:14px;font-size:13.5px;color:#1d4ed8}
</style></head><body><div class="card">
<img src="/logo-mark.png" alt="">
${body}
</div></body></html>`;
}

export function renderPayPage(search: URLSearchParams): { status: number; html: string } {
  const target = safePhonePeUrl(search.get("u"));
  const order = (search.get("o") ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30);

  if (!target) {
    return {
      status: 400,
      html: shell(`<h1>भुगतान का लिंक सही नहीं है</h1>
<p>This payment link is not valid. कृपया अपने ऑर्डर पेज से दोबारा "भुगतान" दबाइए।</p>
<a class="link" href="/">saubhagya.net</a>`),
    };
  }

  const href = esc(target);
  return {
    status: 200,
    html: shell(`<h1>सौभाग्य — भुगतान</h1>
${order ? `<p>ऑर्डर / Order: <span class="o">${esc(order)}</span></p>` : ""}
<p>आप PhonePe के सुरक्षित भुगतान पेज पर जा रहे हैं।<br>You are being taken to PhonePe's secure payment page.</p>
<a class="btn" id="go" href="${href}">PhonePe से भुगतान कीजिए · Pay with PhonePe</a>
<p style="font-size:12.5px">अपने-आप न खुले तो ऊपर का बटन दबाइए।</p>
<script>setTimeout(function(){location.href=document.getElementById("go").href},900);</script>`),
  };
}
