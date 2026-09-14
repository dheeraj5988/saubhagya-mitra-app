import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { isValidReferralCode, storeReferral } from "@/lib/referral";
import { trackReferralClick } from "@/lib/referral.functions";

export const Route = createFileRoute("/r/$code")({
  ssr: false,
  component: ReferralLanding,
  head: () => ({
    meta: [
      { title: "Saubhagya — Referral" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

/**
 * /r/:code — records the click, stores the code first-touch, then hands the
 * visitor straight to the order form. Nothing is ever rendered beyond a spinner.
 */
function ReferralLanding() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isValidReferralCode(code)) {
        try {
          const result = await trackReferralClick({
            data: {
              code,
              ip_address: null,
              user_agent:
                typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
            },
          });
          if (result.valid) storeReferral(code);
        } catch {
          /* tracking is best-effort; the visitor still reaches the form */
        }
      }
      if (!cancelled) void navigate({ to: "/", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
