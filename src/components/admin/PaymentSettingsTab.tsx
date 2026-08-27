import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageOff, KeyRound, Loader2, RefreshCw, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminPaymentSettings,
  adminSavePaymentSettings,
  adminSavePaypurSecrets,
  adminUploadTarget,
} from "@/lib/admin-catalog.functions";
import type { AdminPaymentSettings } from "@/lib/catalog.schema";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  const fetchSettings = useServerFn(adminPaymentSettings);
  const saveSettings = useServerFn(adminSavePaymentSettings);
  const saveSecrets = useServerFn(adminSavePaypurSecrets);
  const uploadTarget = useServerFn(adminUploadTarget);

  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [savingSecrets, setSavingSecrets] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchSettings({ data: { token } });
      setSettings(res);
      setQrPreview(res.qr_url);
    } catch (err) {
      onError(err, "Could not load payment settings.");
    } finally {
      setLoading(false);
    }
  }, [fetchSettings, token, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickQr(file: File | null) {
    if (!file || !settings) return;
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX_BYTES) {
      toast.error("Upload a JPG, PNG or WebP image under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const target = await uploadTarget({
        data: { token, bucket: "payment-assets", kind: "qr", ext },
      });
      const { error } = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      setSettings({ ...settings, qr_image_path: target.path });
      setQrPreview(URL.createObjectURL(file));
      toast.success("QR uploaded — save to publish it.");
    } catch (err) {
      onError(err, "QR upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings({
        data: {
          token,
          display_name: settings.display_name,
          upi_id: settings.upi_id,
          instructions: settings.instructions,
          amount: settings.amount,
          qr_image_path: settings.qr_image_path,
          paypur_enabled: settings.paypur_enabled,
          paypur_base_url: settings.paypur_base_url || "https://upi.paypur.in",
          paypur_amount: settings.paypur_amount,
          paypur_success_url: settings.paypur_success_url,
          paypur_failure_url: settings.paypur_failure_url,
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
    if (!apiKey.trim() && !signingSecret.trim()) {
      toast.error("Enter at least one credential to update.");
      return;
    }
    setSavingSecrets(true);
    try {
      await saveSecrets({
        data: {
          token,
          ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
          ...(signingSecret.trim() ? { signing_secret: signingSecret.trim() } : {}),
        },
      });
      setApiKey("");
      setSigningSecret("");
      toast.success("PayPur credentials updated.");
      void load();
    } catch (err) {
      onError(err, "Could not update credentials.");
    } finally {
      setSavingSecrets(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="grid place-items-center rounded-xl border border-border bg-card py-16 text-muted-foreground shadow-card">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <p className="text-sm text-muted-foreground">
          The QR panel below is what candidates see immediately after placing an order.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Reload
          </Button>
          <Button size="sm" disabled={saving || uploading} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-bold text-navy">Payment QR</h3>
          {qrPreview ? (
            <img
              src={qrPreview}
              alt="Payment QR"
              className="mx-auto size-56 rounded-lg border border-border object-contain p-2"
            />
          ) : (
            <div className="mx-auto grid size-56 place-items-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground">
              <ImageOff className="size-6" />
              <span className="text-xs">No QR uploaded</span>
            </div>
          )}
          <input
            id="qr_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void pickQr(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => document.getElementById("qr_file")?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{" "}
            Upload QR image
          </Button>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="text-sm font-bold text-navy">Payment panel details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">Account / display name</Label>
              <Input
                id="display_name"
                value={settings.display_name ?? ""}
                onChange={(e) => setSettings({ ...settings, display_name: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                value={settings.upi_id ?? ""}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value || null })}
                placeholder="name@bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount shown to candidate (₹)</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                value={settings.amount ?? ""}
                onChange={(e) => setSettings({ ...settings, amount: num(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              rows={3}
              maxLength={1000}
              value={settings.instructions ?? ""}
              onChange={(e) => setSettings({ ...settings, instructions: e.target.value || null })}
              placeholder="भुगतान के बाद स्क्रीनशॉट अपलोड करें…"
            />
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-navy">PayPur UPI gateway (optional)</h3>
            <p className="text-xs text-muted-foreground">
              Disabled by default. Only callbacks with a valid signature can change a payment
              status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="paypur_enabled"
              checked={settings.paypur_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, paypur_enabled: v })}
            />
            <Label htmlFor="paypur_enabled">{settings.paypur_enabled ? "Enabled" : "Disabled"}</Label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paypur_base_url">Base URL</Label>
            <Input
              id="paypur_base_url"
              value={settings.paypur_base_url}
              onChange={(e) => setSettings({ ...settings, paypur_base_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paypur_amount">Charge amount (₹)</Label>
            <Input
              id="paypur_amount"
              type="number"
              min={0}
              value={settings.paypur_amount ?? ""}
              onChange={(e) => setSettings({ ...settings, paypur_amount: num(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paypur_success_url">Success redirect URL</Label>
            <Input
              id="paypur_success_url"
              value={settings.paypur_success_url ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, paypur_success_url: e.target.value || null })
              }
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paypur_failure_url">Failure redirect URL</Label>
            <Input
              id="paypur_failure_url"
              value={settings.paypur_failure_url ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, paypur_failure_url: e.target.value || null })
              }
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <KeyRound className="size-4" /> Credentials
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Stored server-side and never sent back to this screen. Currently on file: API key{" "}
            <strong>{settings.has_api_key ? "yes" : "no"}</strong>, signing secret{" "}
            <strong>{settings.has_signing_secret ? "yes" : "no"}</strong>.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="api_key">API key</Label>
              <Input
                id="api_key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signing_secret">Signing secret</Label>
              <Input
                id="signing_secret"
                type="password"
                autoComplete="off"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                placeholder="Leave blank to keep current"
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
            {savingSecrets ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
            Update credentials
          </Button>
        </div>
      </section>
    </div>
  );
}
