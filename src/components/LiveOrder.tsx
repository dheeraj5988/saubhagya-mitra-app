import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { OrderForm } from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

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
    img.src = `${PROBE_URL}?_t=${Date.now()}`;
  });
}

export function LiveOrder() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [status, setStatus] = useState<"probing" | "live" | "fallback">("probing");
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    // Dev override: ?fallback=1 forces the fallback form in development
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("fallback") === "1") {
        setStatus("fallback");
        return;
      }
    }

    // Safety timeout: always resolve to fallback if total timeout expires
    const totalTimer = setTimeout(() => {
      if (!unmountedRef.current && status === "probing") {
        setStatus("fallback");
      }
    }, TOTAL_TIMEOUT_MS);

    // Initial probe at 0s
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void probeOnce().then((success) => {
      if (unmountedRef.current) return;
      if (success) {
        clearTimeout(totalTimer);
        setStatus("live");
      } else {
        // Second probe at +3s
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-24 text-muted-foreground shadow-card">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">
          {en ? "Connecting to order system…" : "ऑर्डर सिस्टम से जुड़ रहे हैं…"}
        </p>
      </div>
    );
  }

  if (status === "live") {
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <iframe
          src="https://order.saubhagya.net/"
          title="Saubhagya Order System"
          className="h-[950px] w-full border-0"
          allow="clipboard-write"
        />
      </div>
    );
  }

  // Fallback mode (Supabase form)
  return <OrderForm isFallback={true} />;
}
