import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminPaymentConfig,
  adminSavePaymentConfig,
  adminSavePhonePeSecrets,
} from "@/lib/admin-catalog.functions";
import type { AdminPaymentConfig, PhonePeEnvironment } from "@/lib/catalog.schema";
import { formatInr } from "@/lib/pricing";

function num(value: string) {
  const parsed = Number(value);
  return value.trim() === "" || Number.isNaN(parsed) ? null : parsed;
}

export function PaymentSettingsTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const fetchConfig = useServerFn(adminPaymentConfig);
  const saveConfig = useServerFn(adminSavePaymentConfig);
  const saveSecrets = useServerFn(adminSavePhonePeSecrets);

  const [cfg, setCfg] = useState<AdminPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [saltKey, setSaltKey] = useState("");
  const [saltIndex, setSaltIndex] = useState("");
  const [cashfreeSecret, setCashfreeSecret] = useState("");
  const [savingSecrets, setSavingSecrets] = useState(false);

  const load = useCallback(async () => {
    try {
      setCfg(await fetchConfig({ data: { token } }));
    } catch (err) {
      onError(err, "Could not load payment settings.");
    } finally {
      setLoading(false);
    }
  }, [fetchConfig, token, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveConfig({
        data: {
          token,
          rate_per_voter: cfg.rate_per_voter,
          min_order_amount: cfg.min_order_amount,
          free_sample_voter_count: cfg.free_sample_voter_count,
          phonepe_enabled: cfg.phonepe_enabled,
          phonepe_environment: cfg.phonepe_environment,
          phonepe_merchant_id: cfg.phonepe_merchant_id,
          phonepe_client_id: cfg.phonepe_client_id,
          phonepe_redirect_url: cfg.phonepe_redirect_url,
          phonepe_callback_url: cfg.phonepe_callback_url,
        },
      });
      toast.success("Payment settings saved.");
      void load();
    } catch (err) {
      onError(err, "Could not save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function persistSecrets() {
    if (!clientSecret.trim() && !saltKey.trim() && !saltIndex.trim()) {
      toast.error("Enter at least one credential to update.");
      return;
    }
    setSavingSecrets(true);
    try {
      await saveSecrets({
        data: {
          token,
          ...(clientSecret.trim() ? { client_secret: clientSecret.trim() } : {}),
          ...(saltKey.trim() ? { salt_key: saltKey.trim() } : {}),
          ...(saltIndex.trim() ? { salt_index: saltIndex.trim() } : {}),
        },
      });
      setClientSecret("");
      setSaltKey("");
      setSaltIndex("");
      setCashfreeSecret("");
      toast.success("PhonePe credentials updated.");
      void load();
    } catch (err) {
      onError(err, "Could not update credentials.");
    } finally {
      setSavingSecrets(false);
    }
  }

  if (loading || !cfg) {
    return (
      <div className="grid place-items-center rounded-xl border border-border bg-card py-16 text-muted-foreground shadow-card">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const sampleOrder = Math.round(1000 * cfg.rate_per_voter * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <p className="text-sm text-muted-foreground">
          Pricing is applied when an order is created: ward voter count × rate per voter.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Reload
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            settings
          </Button>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-sm font-bold text-navy">Pricing</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="rate">Rate per voter (₹)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min={0}
              value={cfg.rate_per_voter}
              onChange={(e) => setCfg({ ...cfg, rate_per_voter: num(e.target.value) ?? 0 })}
            />
            <p className="text-xs text-muted-foreground">
              1,000 voters = {formatInr(sampleOrder)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_amount">Minimum order amount (₹)</Label>
            <Input
              id="min_amount"
              type="number"
              min={0}
              value={cfg.min_order_amount ?? ""}
              onChange={(e) => setCfg({ ...cfg, min_order_amount: num(e.target.value) })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sample_count">Free sample voters</Label>
            <Input
              id="sample_count"
              type="number"
              min={1}
              value={cfg.free_sample_voter_count}
              onChange={(e) =>
                setCfg({ ...cfg, free_sample_voter_count: num(e.target.value) ?? 24 })
              }
            />
          </div>
        </div>
      </section>


      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-navy">Cashfree payment gateway</h3>
            <p className="text-xs text-muted-foreground">
              Configuration for Cashfree. Keys are stored server-side.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="cashfree_enabled"
              checked={cfg.cashfree_enabled}
              onCheckedChange={(v) => setCfg({ ...cfg, cashfree_enabled: v })}
            />
            <Label htmlFor="cashfree_enabled">{cfg.cashfree_enabled ? "Enabled" : "Disabled"}</Label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cashfree_env">Environment</Label>
            <Select
              value={cfg.cashfree_env || "sandbox"}
              onValueChange={(v) =>
                setCfg({ ...cfg, cashfree_env: v })
              }
            >
              <SelectTrigger id="cashfree_env">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cashfree_app_id">App ID</Label>
            <Input
              id="cashfree_app_id"
              value={cfg.cashfree_app_id ?? ""}
              onChange={(e) =>
                setCfg({ ...cfg, cashfree_app_id: e.target.value || null })
              }
            />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <KeyRound className="size-4" /> Credentials
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Stored server-side. Currently on file: secret key{" "}
            <strong>{cfg.has_cashfree_secret ? "yes" : "no"}</strong>.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="cashfree_secret">Secret key</Label>
              <Input
                id="cashfree_secret"
                type="password"
                autoComplete="off"
                value={cashfreeSecret}
                onChange={(e) => setCashfreeSecret(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-navy">PhonePe payment gateway</h3>
            <p className="text-xs text-muted-foreground">
              Disabled until onboarding is complete. Keys are stored server-side and never shown
              again after saving.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="phonepe_enabled"
              checked={cfg.phonepe_enabled}
              onCheckedChange={(v) => setCfg({ ...cfg, phonepe_enabled: v })}
            />
            <Label htmlFor="phonepe_enabled">{cfg.phonepe_enabled ? "Enabled" : "Disabled"}</Label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phonepe_env">Environment</Label>
            <Select
              value={cfg.phonepe_environment}
              onValueChange={(v) =>
                setCfg({ ...cfg, phonepe_environment: v as PhonePeEnvironment })
              }
            >
              <SelectTrigger id="phonepe_env">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANDBOX">Sandbox</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant_id">Merchant ID</Label>
            <Input
              id="merchant_id"
              value={cfg.phonepe_merchant_id ?? ""}
              onChange={(e) =>
                setCfg({ ...cfg, phonepe_merchant_id: e.target.value || null })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={cfg.phonepe_client_id ?? ""}
              onChange={(e) => setCfg({ ...cfg, phonepe_client_id: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirect_url">Redirect URL</Label>
            <Input
              id="redirect_url"
              value={cfg.phonepe_redirect_url ?? ""}
              onChange={(e) => setCfg({ ...cfg, phonepe_redirect_url: e.target.value || null })}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callback_url">Callback URL</Label>
            <Input
              id="callback_url"
              value={cfg.phonepe_callback_url ?? ""}
              onChange={(e) => setCfg({ ...cfg, phonepe_callback_url: e.target.value || null })}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <KeyRound className="size-4" /> Credentials
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Stored server-side and never sent back to this screen. Currently on file: client secret{" "}
            <strong>{cfg.has_client_secret ? "yes" : "no"}</strong>, salt key{" "}
            <strong>{cfg.has_salt_key ? "yes" : "no"}</strong>.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client secret</Label>
              <Input
                id="client_secret"
                type="password"
                autoComplete="off"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salt_key">Salt key</Label>
              <Input
                id="salt_key"
                type="password"
                autoComplete="off"
                value={saltKey}
                onChange={(e) => setSaltKey(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salt_index">Salt index</Label>
              <Input
                id="salt_index"
                autoComplete="off"
                value={saltIndex}
                onChange={(e) => setSaltIndex(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={savingSecrets}
            onClick={() => void persistSecrets()}
          >
            {savingSecrets ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}{" "}
            Update credentials
          </Button>
        </div>
      </section>
    </div>
  );
}
