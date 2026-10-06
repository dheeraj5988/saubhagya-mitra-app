import { useEffect, useState } from "react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

/**
 * 06.10.2026 — PhonePe review: the customer flow goes from saubhagya.net to the order
 * page at https://order.saubhagya.net/order (same business, our own sub-domain).
 * Owner: keep it a small button (like "ऑर्डर कैसे करें?") so the home page stays visible.
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={ORDER_URL + qs}
        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        🛒 {en ? "Order now →" : "ऑर्डर करें →"}
      </a>
      <span className="text-xs text-muted-foreground">order.saubhagya.net/order</span>
    </div>
  );
}
