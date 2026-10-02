import { useCallback, useEffect, useState } from "react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

/**
 * The order + sample page runs on Saubhagya's own computer and is published
 * through Cloudflare Tunnel at order.saubhagya.net. When it answers, it is shown
 * here; when that computer is off, the older order form below is used instead.
 *
 * On a phone the live page opens full screen by default. A history entry is
 * pushed for that, so the phone's Back button (or the "back to site" button)
 * returns to the normal page without reloading the order page.
 */
const ORDER_URL = "https://order.saubhagya.net/order";
const PROBE_URL = "https://order.saubhagya.net/symbols/p01.png";
const PHONE = "(max-width: 767px)";

function isPhone() {
  return typeof window !== "undefined" && window.matchMedia(PHONE).matches;
}

export function LiveOrder() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [state, setState] = useState<"check" | "live" | "off">("check");
  const [qs, setQs] = useState("");
  const [full, setFull] = useState(false);

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

  // Phone: full screen as soon as the live page is available; Back = normal view.
  useEffect(() => {
    if (state !== "live" || !isPhone()) return;
    window.history.pushState({ sbgFull: true }, "");
    setFull(true);
  }, [state]);

  useEffect(() => {
    const onPop = () => setFull(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  const enterFull = useCallback((e: { preventDefault: () => void }) => {
    if (!isPhone()) return; // desktop keeps the new-tab link
    e.preventDefault();
    window.history.pushState({ sbgFull: true }, "");
    setFull(true);
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

  const src = `${ORDER_URL}${qs}`;

  // The iframe stays the first child in both modes so React only updates its
  // className — moving or remounting it would reload the order page.
  return (
    <div
      className={
        full
          ? "fixed inset-0 z-[100] flex flex-col bg-white"
          : "overflow-hidden rounded-2xl border bg-white shadow-sm"
      }
    >
      <iframe
        title={en ? "Order" : "ऑर्डर"}
        src={src}
        className={
          full
            ? "block min-h-0 w-full flex-1 border-0"
            : "block h-[85dvh] min-h-[560px] w-full border-0"
        }
        allow="clipboard-write"
      />
      {full ? (
        <div className="order-first flex h-10 shrink-0 items-center gap-2 border-b bg-white px-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border px-3 py-1 text-sm font-semibold text-primary"
          >
            {en ? "← Back to site" : "← साइट पर वापस"}
          </button>
          <span className="truncate text-xs text-muted-foreground">
            {en ? "Order page — full screen" : "ऑर्डर पेज — पूरी स्क्रीन"}
          </span>
        </div>
      ) : (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {en ? "Easier on a phone: " : "फ़ोन पर आसान: "}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={enterFull}
            className="font-semibold text-primary underline underline-offset-4"
          >
            {en ? "open the order page full screen" : "ऑर्डर पेज पूरी स्क्रीन पर खोलिए"}
          </a>
        </p>
      )}
    </div>
  );
}
