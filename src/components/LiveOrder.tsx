import { useEffect, useState } from "react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

/**
 * The order + sample page runs on Saubhagya's own computer and is published
 * through Cloudflare Tunnel at order.saubhagya.net. When it answers, it is shown
 * here; when that computer is off, the older order form below is used instead.
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

  if (state === "check") {
    return (
      <p className="rounded-xl border bg-white px-4 py-6 text-center text-sm text-muted-foreground">
        {en ? "Opening the order form…" : "ऑर्डर फ़ॉर्म खुल रहा है…"}
      </p>
    );
  }

  if (state === "off") {
    return <OrderForm />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <iframe
        title={en ? "Order voter slips" : "वोटर स्लिप का ऑर्डर"}
        src={`${ORDER_URL}${qs}`}
        className="block h-[85dvh] min-h-[560px] w-full border-0"
        allow="clipboard-write"
      />
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        {en ? "Easier on a phone: " : "फ़ोन पर आसान: "}
        <a
          href={`${ORDER_URL}${qs}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-4"
        >
          {en ? "open the order page full screen" : "ऑर्डर पेज पूरी स्क्रीन पर खोलिए"}
        </a>
      </p>
    </div>
  );
}
