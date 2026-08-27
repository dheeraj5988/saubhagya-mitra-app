import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageOff, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteSymbol,
  adminSaveSymbol,
  adminSymbols,
  adminUploadTarget,
} from "@/lib/admin-catalog.functions";
import type { AdminSymbol } from "@/lib/catalog.schema";
import { cn } from "@/lib/utils";

type Draft = {
  id: string | null;
  party_name: string;
  symbol_name: string;
  symbol_image_path: string | null;
  active: boolean;
  sort_order: number;
  preview: string | null;
};

const EMPTY: Draft = {
  id: null,
  party_name: "",
  symbol_name: "",
  symbol_image_path: null,
  active: true,
  sort_order: 0,
  preview: null,
};

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function SymbolsTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const fetchSymbols = useServerFn(adminSymbols);
  const saveSymbol = useServerFn(adminSaveSymbol);
  const deleteSymbol = useServerFn(adminDeleteSymbol);
  const uploadTarget = useServerFn(adminUploadTarget);

  const [rows, setRows] = useState<AdminSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminSymbol | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchSymbols({ data: { token } });
      setRows(res.symbols);
    } catch (err) {
      onError(err, "Could not load the symbol catalog.");
    } finally {
      setLoading(false);
    }
  }, [fetchSymbols, token, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickImage(file: File | null) {
    if (!file || !draft) return;
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX_BYTES) {
      toast.error("Upload a JPG, PNG or WebP image under 2MB.");
      return;
    }
    setUploading(true);
    try {
      // The browser uploads with a short-lived signed target, never a service key.
      const target = await uploadTarget({
        data: { token, bucket: "election-symbols", kind: "symbol", ext },
      });
      const { error } = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      setDraft({ ...draft, symbol_image_path: target.path, preview: URL.createObjectURL(file) });
      toast.success("Image ready — save to apply.");
    } catch (err) {
      onError(err, "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.party_name.trim() || !draft.symbol_name.trim()) {
      toast.error("Party name and symbol name are required.");
      return;
    }
    setSaving(true);
    try {
      await saveSymbol({
        data: {
          token,
          id: draft.id,
          party_name: draft.party_name.trim(),
          symbol_name: draft.symbol_name.trim(),
          symbol_image_path: draft.symbol_image_path,
          active: draft.active,
          sort_order: draft.sort_order,
        },
      });
      toast.success(draft.id ? "Symbol updated." : "Symbol added.");
      setDraft(null);
      void load();
    } catch (err) {
      onError(err, "Could not save the symbol.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSymbol({ data: { token, id: pendingDelete.id } });
      toast.success(`${pendingDelete.party_name} — ${pendingDelete.symbol_name} deleted.`);
      setPendingDelete(null);
      void load();
    } catch (err) {
      onError(err, "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
        <p className="text-sm text-muted-foreground">
          Parties and election symbols offered in the public order form. Inactive entries stay
          hidden from candidates but never change past orders.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setDraft({ ...EMPTY, sort_order: rows.length })}>
            <Plus className="size-4" /> Add symbol
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !rows.length ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No symbols yet — add the first party and symbol.
          </p>
        ) : (
          <div className="relative max-h-[calc(100vh-24rem)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <colgroup>
                <col className="w-[70px]" />
                <col className="w-[240px]" />
                <col className="w-[220px]" />
                <col className="w-[90px]" />
                <col className="w-[100px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
                <tr>
                  {["Icon", "Party", "Symbol", "Order", "Status", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-border/70 transition-colors hover:bg-saffron/[0.06]"
                  >
                    <td className="px-3 py-2">
                      {s.image_url ? (
                        <img
                          src={s.image_url}
                          alt=""
                          className="size-9 rounded-md border border-border object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid size-9 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
                          <ImageOff className="size-4" />
                        </span>
                      )}
                    </td>
                    <td className="truncate px-3 py-2 font-medium" title={s.party_name}>
                      {s.party_name}
                    </td>
                    <td className="truncate px-3 py-2" title={s.symbol_name}>
                      {s.symbol_name}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{s.sort_order}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold",
                          s.active
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {s.active ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          title={`Edit ${s.party_name}`}
                          onClick={() =>
                            setDraft({
                              id: s.id,
                              party_name: s.party_name,
                              symbol_name: s.symbol_name,
                              symbol_image_path: s.symbol_image_path,
                              active: s.active,
                              sort_order: s.sort_order,
                              preview: s.image_url,
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          title={`Delete ${s.party_name}`}
                          onClick={() => setPendingDelete(s)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && !saving && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit symbol" : "Add symbol"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="party_name">Party name</Label>
                <Input
                  id="party_name"
                  value={draft.party_name}
                  onChange={(e) => setDraft({ ...draft, party_name: e.target.value })}
                  placeholder="e.g. निर्दलीय / Independent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol_name">Symbol name</Label>
                <Input
                  id="symbol_name"
                  value={draft.symbol_name}
                  onChange={(e) => setDraft({ ...draft, symbol_name: e.target.value })}
                  placeholder="e.g. छाता / Umbrella"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min={0}
                    value={draft.sort_order}
                    onChange={(e) =>
                      setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex items-end gap-3 pb-2">
                  <Switch
                    id="active"
                    checked={draft.active}
                    onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                  />
                  <Label htmlFor="active">Visible to candidates</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol_image">Symbol image (JPG/PNG/WebP, max 2MB)</Label>
                <div className="flex items-center gap-3">
                  {draft.preview ? (
                    <img
                      src={draft.preview}
                      alt=""
                      className="size-16 rounded-lg border border-border object-contain"
                    />
                  ) : (
                    <span className="grid size-16 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                      <ImageOff className="size-5" />
                    </span>
                  )}
                  <input
                    id="symbol_image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => void pickImage(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById("symbol_image")?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}{" "}
                    Upload image
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={saving || uploading} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save symbol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this symbol?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.party_name} — {pendingDelete?.symbol_name} will be removed from the
              catalog. Orders already placed keep the symbol recorded on them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
