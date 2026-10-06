import { useEffect, useState } from "react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

/**
 * 06.10.2026 — PhonePe review: the customer flow must go from saubhagya.net to the
 * order page at https://order.saubhagya.net/order (same business, our own sub-domain).
 * So the home page no longer embeds the order page in an iframe; it shows a clear
 * "Order" button that opens https://order.saubhagya.net/order in the same tab.
 *
 * The order page runs on Saubhagya's own computer (Cloudflare Tunnel). When that
 * computer is off, the older order form below is shown instead (as before).
 */
const ORDER_URL = "https://order.saubhagya.net/order";
const PROBE_URL = "https://order.saubhagya.net/symbols/p01.png";

export function LiveOrder() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [state, setState] = useState<"check" | "live" | "off">("check");
  const [qs, setQs] = useState("");

  useEffect(() => {
    setQs(window.location.search);
    let done = false;
    const finish = (s: "live" | "off") => {
      if (!done) {
        done = true;
        setState(s);
      }
    };
    const timer = window.setTimeout(() => finish("off"), 6000);
    const img = new Image();
    img.onload = () => finish("live");
    img.onerror = () => finish("off");
    img.src = `${PROBE_URL}?t=${Date.now()}`;
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (state === "off") return <OrderForm />;

  const href = ORDER_URL + qs;

  return (
    <div className="rounded-2xl border bg-white px-5 py-6 text-center shadow-sm">
      <h3 className="text-lg font-bold">
        {en ? "Place your order on our order page" : "हमारे ऑर्डर पेज पर ऑर्डर कीजिए"}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {en
          ? "Choose your area and design, see a sample slip, and pay securely (PhonePe / UPI / cards). Your PDFs come on WhatsApp."
          : "अपना क्षेत्र और डिज़ाइन चुनिए, पर्ची का नमूना देखिए और सुरक्षित भुगतान कीजिए (PhonePe / UPI / कार्ड)। आपकी PDF WhatsApp पर आती हैं।"}
      </p>
      <a
        href={href}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90"
      >
        {state === "check"
          ? en
            ? "Order now →"
            : "ऑर्डर करें →"
          : en
            ? "Order now — open order page →"
            : "ऑर्डर करें — ऑर्डर पेज खोलें →"}
      </a>
      <p className="mt-3 text-xs text-muted-foreground">
        {en ? "Opens " : "खुलेगा: "}
        <a href={href} className="underline">
          order.saubhagya.net/order
        </a>
        {en ? " — Saubhagya's official order page." : " — सौभाग्य का आधिकारिक ऑर्डर पेज।"}
      </p>
    </div>
  );
}
