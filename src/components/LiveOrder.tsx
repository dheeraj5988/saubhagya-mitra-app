import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

/**
 * The order + sample page runs on Saubhagya's own computer and is published
 * through Cloudflare Tunnel at order.saubhagya.net. When it answers (or when
 * the Cloudflare Worker snapshot answers), it is shown here; when neither
 * answers, the Supabase fallback form is used instead.
 */
const ORDER_URL = "https://order.saubhagya.net/order";
const PROBE_URL = "https://order.saubhagya.net/symbols/p01.png";
const TOTAL_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 3000;
const PROBE_TIMEOUT_MS = 3500;

function probeOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const img = new Image();
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        img.src = "";
        resolve(false);
      }
    }, PROBE_TIMEOUT_MS);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = `${PROBE_URL}?t=${Date.now()}`;
  });
}

export function LiveOrder() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [status, setStatus] = useState<"probing" | "live" | "fallback">("probing");
  const [qs, setQs] = useState("");
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    setQs(window.location.search);

    // Dev override: ?fallback=1 forces the fallback form in development
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("fallback") === "1") {
        setStatus("fallback");
        return;
      }
    }

    // Total safety timeout: 8s
    const totalTimer = setTimeout(() => {
      if (!unmountedRef.current && status === "probing") {
        setStatus("fallback");
      }
    }, TOTAL_TIMEOUT_MS);

    // Probe 1 at 0s
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void probeOnce().then((success) => {
      if (unmountedRef.current) return;
      if (success) {
        clearTimeout(totalTimer);
        setStatus("live");
      } else {
        // Probe 2 at +3s
        retryTimer = setTimeout(() => {
          if (unmountedRef.current) return;
          void probeOnce().then((retrySuccess) => {
            if (unmountedRef.current) return;
            clearTimeout(totalTimer);
            setStatus(retrySuccess ? "live" : "fallback");
          });
        }, RETRY_DELAY_MS);
      }
    });

    return () => {
      unmountedRef.current = true;
      clearTimeout(totalTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  if (status === "probing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-20 text-muted-foreground shadow-card">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">
          {en ? "Connecting to order system…" : "ऑर्डर सिस्टम से जुड़ रहे हैं…"}
        </p>
      </div>
    );
  }

  if (status === "live") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <iframe
          title={en ? "Order voter slips" : "वोटर स्लिप का ऑर्डर"}
          src={`${ORDER_URL}${qs}`}
          className="block h-[85dvh] min-h-[560px] w-full border-0"
          allow="clipboard-write"
        />
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
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

  // Fallback mode (Supabase form)
  return <OrderForm isFallback={true} />;
}
