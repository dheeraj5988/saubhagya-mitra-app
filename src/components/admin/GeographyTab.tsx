import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  adminDeleteGeo,
  adminGeoStats,
  adminGeography,
  adminImportGeography,
  adminSaveDistrict,
  adminSaveGramPanchayat,
  adminSaveSamiti,
  adminSaveWard,
} from "@/lib/admin-geo.functions";
import type { GeoRow, GeoWardRow } from "@/lib/admin-geo.schema";
import { GEO_CSV_HEADER, parseGeoCsv, type GeoCsvResult } from "@/lib/csv";

type Level = "district" | "samiti" | "gram_panchayat" | "ward";

const CHUNK_SIZE = 500;
const MAX_ROWS = 20_000;

export function GeographyTab({
  token,
  onError,
}: {
  token: string;
  onError: (err: unknown, fallback: string) => boolean;
}) {
  const fetchGeo = useServerFn(adminGeography);
  const saveDistrict = useServerFn(adminSaveDistrict);
  const saveSamiti = useServerFn(adminSaveSamiti);
  const saveGp = useServerFn(adminSaveGramPanchayat);
  const saveWard = useServerFn(adminSaveWard);
  const removeGeo = useServerFn(adminDeleteGeo);
  const importGeo = useServerFn(adminImportGeography);

  const [districts, setDistricts] = useState<GeoRow[]>([]);
  const [samitis, setSamitis] = useState<GeoRow[]>([]);
  const [gps, setGps] = useState<GeoRow[]>([]);
  const [wards, setWards] = useState<GeoWardRow[]>([]);

  const [districtId, setDistrictId] = useState<string | null>(null);
  const [samitiId, setSamitiId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [newDistrict, setNewDistrict] = useState("");
  const [newSamiti, setNewSamiti] = useState("");
  const [newGp, setNewGp] = useState("");
  const [newWard, setNewWard] = useState("");
  const [newVoters, setNewVoters] = useState("");
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<GeoCsvResult | null>(null);
  const [summary, setSummary] = useState<{
    districts: number;
    samitis: number;
    gram_panchayats: number;
    wards: number;
    inserted: number;
    updated: number;
    rejected: number;
  } | null>(null);
  const [stats, setStats] = useState<{
    districts: number;
    samitis: number;
    gram_panchayats: number;
    wards: number;
    last_import: string | null;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const fetchStats = useServerFn(adminGeoStats);

  const load = useCallback(async () => {
    try {
      const res = await fetchGeo({
        data: {
          token,
          district_id: districtId,
          samiti_id: samitiId,
          gram_panchayat_id: gpId,
        },
      });
      setDistricts(res.districts);
      setSamitis(res.samitis);
      setGps(res.gramPanchayats);
      setWards(res.wards);
    } catch (err) {
      onError(err, "Could not load geography data.");
    } finally {
      setLoading(false);
    }
  }, [fetchGeo, token, districtId, samitiId, gpId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addDistrict() {
    if (!newDistrict.trim()) return;
    try {
      await saveDistrict({ data: { token, name: newDistrict.trim(), active: true } });
      setNewDistrict("");
      toast.success("District added.");
      void load();
    } catch (err) {
      onError(err, "Could not add the district.");
    }
  }

  async function addSamiti() {
    if (!districtId || !newSamiti.trim()) return;
    try {
      await saveSamiti({
        data: { token, district_id: districtId, name: newSamiti.trim(), active: true },
      });
      setNewSamiti("");
      toast.success("Panchayat samiti added.");
      void load();
    } catch (err) {
      onError(err, "Could not add the panchayat samiti.");
    }
  }

  async function addGp() {
    if (!samitiId || !newGp.trim()) return;
    try {
      await saveGp({ data: { token, samiti_id: samitiId, name: newGp.trim(), active: true } });
      setNewGp("");
      toast.success("Gram panchayat added.");
      void load();
    } catch (err) {
      onError(err, "Could not add the gram panchayat.");
    }
  }

  async function addWard() {
    if (!gpId || !newWard.trim()) return;
    const count = Number(newVoters);
    try {
      await saveWard({
        data: {
          token,
          gram_panchayat_id: gpId,
          ward_number: newWard.trim(),
          voter_count: Number.isFinite(count) && count > 0 ? Math.round(count) : 0,
          active: true,
        },
      });
      setNewWard("");
      setNewVoters("");
      toast.success("Ward added.");
      void load();
    } catch (err) {
      onError(err, "Could not add the ward.");
    }
  }

  async function updateWardVoters(ward: GeoWardRow, value: number) {
    if (!gpId) return;
    try {
      await saveWard({
        data: {
          token,
          id: ward.id,
          gram_panchayat_id: gpId,
          ward_number: ward.ward_number,
          voter_count: value,
          active: ward.active,
        },
      });
      toast.success(`Ward ${ward.ward_number} updated.`);
      void load();
    } catch (err) {
      onError(err, "Could not update the ward.");
    }
  }

  async function remove(level: Level, id: string) {
    try {
      await removeGeo({ data: { token, level, id } });
      if (level === "district" && districtId === id) {
        setDistrictId(null);
        setSamitiId(null);
        setGpId(null);
      }
      if (level === "samiti" && samitiId === id) {
        setSamitiId(null);
        setGpId(null);
      }
      if (level === "gram_panchayat" && gpId === id) setGpId(null);
      toast.success("Deleted.");
      void load();
    } catch (err) {
      onError(err, "Could not delete. Remove its child records first.");
    }
  }

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchStats({ data: { token } }));
    } catch {
      /* the panel is informational only */
    }
  }, [fetchStats, token]);

  async function onPickFile(file: File | null) {
    setSummary(null);
    if (!file) {
      setFileName(null);
      setParsed(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseGeoCsv(text));
  }

  function downloadTemplate() {
    const body = `${GEO_CSV_HEADER}\nAjmer,केकडी नगर पालिका,केकडी नगर पालिका,1,867\n`;
    const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "geography-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Chunked so a 10,000+ row sheet never exceeds one request's limits. */
  async function importRows(result: GeoCsvResult, clear: () => void) {
    const rows = result.rows;
    if (!rows.length) {
      toast.error("No valid rows to import.");
      return;
    }
    if (rows.length > MAX_ROWS) {
      toast.error(`Import at most ${MAX_ROWS.toLocaleString("en-IN")} rows at a time.`);
      return;
    }
    setImporting(true);
    setSummary(null);
    const districtNames = new Set<string>();
    const samitiKeys = new Set<string>();
    const gpKeys = new Set<string>();
    let inserted = 0;
    let updated = 0;
    try {
      const chunks = Math.ceil(rows.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        const slice = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        setProgress({ done: i * CHUNK_SIZE, total: rows.length });
        const res = await importGeo({ data: { token, rows: slice } });
        inserted += res.inserted;
        updated += res.updated;
        for (const row of slice) {
          districtNames.add(row.district);
          samitiKeys.add(`${row.district}|${row.panchayat_samiti}`);
          gpKeys.add(`${row.district}|${row.panchayat_samiti}|${row.gram_panchayat}`);
        }
      }
      setSummary({
        districts: districtNames.size,
        samitis: samitiKeys.size,
        gram_panchayats: gpKeys.size,
        wards: inserted + updated,
        inserted,
        updated,
        rejected: result.errors.length,
      });
      clear();
      toast.success(`Imported ${(inserted + updated).toLocaleString("en-IN")} ward row(s).`);
      void load();
      void loadStats();
    } catch (err) {
      onError(err, "Import failed.");
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  function Column({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <section className="flex min-h-[320px] flex-col rounded-xl border border-border bg-card shadow-card">
        <h3 className="border-b border-border px-3 py-2 text-sm font-bold text-navy">{title}</h3>
        <div className="flex-1 overflow-y-auto p-2">{children}</div>
      </section>
    );
  }

  if (loading) {
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
          Voter counts entered here drive the price shown to candidates.
        </p>
        <div className="flex items-center gap-4">
          {stats ? (
            <p className="text-xs text-muted-foreground">
              {stats.districts.toLocaleString("en-IN")} districts ·{" "}
              {stats.samitis.toLocaleString("en-IN")} samitis ·{" "}
              {stats.gram_panchayats.toLocaleString("en-IN")} gram panchayats ·{" "}
              <span className="font-semibold text-navy">{stats.wards.toLocaleString("en-IN")} wards</span>
              {stats.last_import
                ? ` · last import ${new Date(stats.last_import).toLocaleString("en-IN")}`
                : ""}
            </p>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
              void loadStats();
            }}
          >
            <RefreshCw className="size-4" /> Reload
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-4 gap-4">
        <Column title="Districts">
          <div className="mb-2 flex gap-1">
            <Input
              value={newDistrict}
              placeholder="New district"
              onChange={(e) => setNewDistrict(e.target.value)}
              className="h-8"
            />
            <Button size="icon" className="size-8 shrink-0" onClick={() => void addDistrict()}>
              <Plus className="size-4" />
            </Button>
          </div>
          {districts.map((d) => (
            <div
              key={d.id}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                districtId === d.id && "bg-muted font-semibold",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => {
                  setDistrictId(d.id);
                  setSamitiId(null);
                  setGpId(null);
                }}
              >
                {d.name}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label={`Delete ${d.name}`}
                onClick={() => void remove("district", d.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </Column>

        <Column title="Panchayat Samitis">
          {districtId ? (
            <>
              <div className="mb-2 flex gap-1">
                <Input
                  value={newSamiti}
                  placeholder="New samiti"
                  onChange={(e) => setNewSamiti(e.target.value)}
                  className="h-8"
                />
                <Button size="icon" className="size-8 shrink-0" onClick={() => void addSamiti()}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {samitis.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    samitiId === s.id && "bg-muted font-semibold",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => {
                      setSamitiId(s.id);
                      setGpId(null);
                    }}
                  >
                    {s.name}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => void remove("samiti", s.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <p className="p-2 text-xs text-muted-foreground">Select a district.</p>
          )}
        </Column>

        <Column title="Gram Panchayats">
          {samitiId ? (
            <>
              <div className="mb-2 flex gap-1">
                <Input
                  value={newGp}
                  placeholder="New gram panchayat"
                  onChange={(e) => setNewGp(e.target.value)}
                  className="h-8"
                />
                <Button size="icon" className="size-8 shrink-0" onClick={() => void addGp()}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {gps.map((g) => (
                <div
                  key={g.id}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    gpId === g.id && "bg-muted font-semibold",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => setGpId(g.id)}
                  >
                    {g.name}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Delete ${g.name}`}
                    onClick={() => void remove("gram_panchayat", g.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <p className="p-2 text-xs text-muted-foreground">Select a panchayat samiti.</p>
          )}
        </Column>

        <Column title="Wards & voter counts">
          {gpId ? (
            <>
              <div className="mb-2 flex gap-1">
                <Input
                  value={newWard}
                  placeholder="Ward"
                  onChange={(e) => setNewWard(e.target.value)}
                  className="h-8 w-20"
                />
                <Input
                  value={newVoters}
                  type="number"
                  min={0}
                  placeholder="Voters"
                  onChange={(e) => setNewVoters(e.target.value)}
                  className="h-8"
                />
                <Button size="icon" className="size-8 shrink-0" onClick={() => void addWard()}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {wards.map((w) => (
                <div key={w.id} className="flex items-center gap-1 px-2 py-1 text-sm">
                  <span className="w-16 shrink-0 truncate font-semibold">{w.ward_number}</span>
                  <Input
                    className="h-8"
                    type="number"
                    min={0}
                    defaultValue={w.voter_count}
                    aria-label={`Voter count for ward ${w.ward_number}`}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isFinite(value) || value < 0 || value === w.voter_count) return;
                      void updateWardVoters(w, Math.round(value));
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Delete ward ${w.ward_number}`}
                    onClick={() => void remove("ward", w.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <p className="p-2 text-xs text-muted-foreground">Select a gram panchayat.</p>
          )}
        </Column>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-navy">Import geography &amp; voter counts (CSV)</h3>
            <p className="text-xs text-muted-foreground">
              One row per ward. Columns: {GEO_CSV_HEADER}. UTF-8, Hindi names supported. Re-importing a
              corrected sheet updates voter counts instead of duplicating rows.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={downloadTemplate}>
            <Download className="size-4" /> Download CSV template
          </Button>
        </div>

        <div className="rounded-lg border-2 border-dashed border-border p-4">
          <input
            ref={fileRef}
            id="geo_csv_file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              <FileSpreadsheet className="size-4" /> Upload CSV
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileName ?? "No file selected"}
              {parsed ? ` — ${parsed.rows.length.toLocaleString("en-IN")} valid row(s), ${parsed.errors.length} rejected` : ""}
            </span>
          </div>

          {parsed ? (
            <div className="mt-3 space-y-3">
              {parsed.rows.length ? (
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-2 py-1">District</th>
                        <th className="px-2 py-1">Panchayat Samiti</th>
                        <th className="px-2 py-1">Gram Panchayat</th>
                        <th className="px-2 py-1">Ward</th>
                        <th className="px-2 py-1 text-right">Voters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1">{r.district}</td>
                          <td className="px-2 py-1">{r.panchayat_samiti}</td>
                          <td className="px-2 py-1">{r.gram_panchayat}</td>
                          <td className="px-2 py-1">{r.ward_number}</td>
                          <td className="px-2 py-1 text-right">{r.voter_count.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {parsed.errors.length ? (
                <div className="max-h-40 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                  <p className="font-semibold">{parsed.errors.length} row(s) rejected:</p>
                  <ul className="mt-1 space-y-0.5">
                    {parsed.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>Line {e.line}: {e.message}</li>
                    ))}
                  </ul>
                  {parsed.errors.length > 50 ? <p className="mt-1">…and more.</p> : null}
                </div>
              ) : null}

              <Button
                disabled={importing || !parsed.rows.length}
                onClick={() =>
                  void importRows(parsed, () => {
                    setParsed(null);
                    setFileName(null);
                    if (fileRef.current) fileRef.current.value = "";
                  })
                }
              >
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {importing && progress
                  ? ` Importing ${progress.done.toLocaleString("en-IN")} / ${progress.total.toLocaleString("en-IN")}…`
                  : ` Import ${parsed.rows.length.toLocaleString("en-IN")} row(s)`}
              </Button>
            </div>
          ) : null}
        </div>

        {summary ? (
          <div className="grid grid-cols-7 gap-2 rounded-lg border border-success/40 bg-success/5 p-3 text-center text-xs">
            {(
              [
                ["Districts", summary.districts],
                ["Samitis", summary.samitis],
                ["Gram Panchayats", summary.gram_panchayats],
                ["Wards", summary.wards],
                ["Inserted", summary.inserted],
                ["Updated", summary.updated],
                ["Rejected", summary.rejected],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="text-base font-bold text-navy">{value.toLocaleString("en-IN")}</p>
                <p className="text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            Paste rows instead (optional)
          </summary>
          <div className="mt-3 space-y-2">
            <Label htmlFor="geo_csv">Paste rows</Label>
            <Textarea
              id="geo_csv"
              rows={6}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"Jaipur, Amber, Kunda, 1, 842\nJaipur, Amber, Kunda, 2, 917"}
            />
            <Button
              variant="outline"
              disabled={importing || !csv.trim()}
              onClick={() => void importRows(parseGeoCsv(csv), () => setCsv(""))}
            >
              <Upload className="size-4" /> Import pasted rows
            </Button>
          </div>
        </details>
      </section>
    </div>
  );
}
