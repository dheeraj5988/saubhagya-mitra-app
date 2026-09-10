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

  async function runImport() {
    const rows = parseCsv(csv);
    if (!rows.length) {
      toast.error("Paste rows as: District, Panchayat Samiti, Gram Panchayat, Ward, Voters");
      return;
    }
    if (rows.length > 5000) {
      toast.error("Import at most 5000 rows at a time.");
      return;
    }
    setImporting(true);
    try {
      const res = await importGeo({ data: { token, rows } });
      setCsv("");
      toast.success(
        `Imported ${res.wards} ward(s) across ${res.districts} district(s), ${res.samitis} samiti(s), ${res.gram_panchayats} gram panchayat(s).`,
      );
      void load();
    } catch (err) {
      onError(err, "Import failed.");
    } finally {
      setImporting(false);
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
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-4" /> Reload
        </Button>
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

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <div>
          <h3 className="text-sm font-bold text-navy">Bulk CSV import</h3>
          <p className="text-xs text-muted-foreground">
            One row per ward: District, Panchayat Samiti, Gram Panchayat, Ward, Voter count. Re-importing
            a corrected sheet updates voter counts instead of duplicating rows.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="geo_csv">Paste rows</Label>
          <Textarea
            id="geo_csv"
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"Jaipur, Amber, Kunda, 1, 842\nJaipur, Amber, Kunda, 2, 917"}
          />
        </div>
        <Button disabled={importing} onClick={() => void runImport()}>
          {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{" "}
          Import rows
        </Button>
      </section>
    </div>
  );
}
