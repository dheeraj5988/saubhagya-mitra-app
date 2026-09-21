import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileSpreadsheet, Loader2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  WARD_MAPPING_CSV_HEADER,
  parseWardMappingCsv,
  type WardMappingCsvResult,
} from "@/lib/csv";
import {
  adminImportWardMapping,
  adminWardMappingStats,
  type WardMappingImportResult,
} from "@/lib/ward-mapping.functions";

/**
 * Upload the desk app's ward export (district, panchayat_samiti,
 * gram_panchayat, ward_number, app_key) and match it against geo_wards.
 * Re-uploading a corrected file after fixing unmatched rows is safe.
 */
export function WardMappingImportCard({ token }: { token: string }) {
  const fetchStats = useServerFn(adminWardMappingStats);
  const importMapping = useServerFn(adminImportWardMapping);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<WardMappingCsvResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<WardMappingImportResult | null>(null);
  const [stats, setStats] = useState<{
    total_active_wards: number;
    wards_with_app_key: number;
    wards_missing_app_key: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchStats({ data: { token } }));
    } catch {
      // non-fatal — the card still works without the coverage numbers
    } finally {
      setLoadingStats(false);
    }
  }, [fetchStats, token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function onPickFile(file: File | null) {
    setResult(null);
    if (!file) {
      setFileName(null);
      setParsed(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setParsed(parseWardMappingCsv(text));
  }

  async function runImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    try {
      const res = await importMapping({ data: { token, rows: parsed.rows } });
      setResult(res);
      toast.success(`Mapped ${res.matched.toLocaleString("en-IN")} ward(s).`);
      void loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const body = `${WARD_MAPPING_CSV_HEADER}\nSikar,Lachhmangarh,Lachhmangarh,1,WK-00123\n`;
    const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ward-mapping-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadUnmatched() {
    if (!result?.unmatched_rows.length) return;
    const header = "line,reason,district,panchayat_samiti,gram_panchayat,ward_number,app_key";
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = result.unmatched_rows.map(
      (u) =>
        `${u.line},${esc(u.reason)},${esc(u.row.district)},${esc(u.row.panchayat_samiti)},${esc(u.row.gram_panchayat)},${esc(u.row.ward_number)},${esc(u.row.app_key)}`,
    );
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ward-mapping-unmatched.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" /> Ward Mapping Import
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void loadStats()} title="Refresh coverage">
          <RefreshCw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload the desk app's ward export so orders can be sent with the correct{" "}
          <code>ward_key</code>. Columns: <code>{WARD_MAPPING_CSV_HEADER}</code>. Safe to
          re-upload — only matched rows are changed.
        </p>

        {loadingStats ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : stats ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{stats.total_active_wards.toLocaleString("en-IN")} active wards</Badge>
            <Badge className="bg-green-500">{stats.wards_with_app_key.toLocaleString("en-IN")} mapped</Badge>
            {stats.wards_missing_app_key > 0 ? (
              <Badge variant="outline" className="border-orange-400 text-orange-600">
                {stats.wards_missing_app_key.toLocaleString("en-IN")} still missing app_key
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id="ward_mapping_csv_file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileSpreadsheet className="size-4" /> Choose CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" /> Template
          </Button>
          <span className="text-sm text-muted-foreground">{fileName ?? "No file selected"}</span>
        </div>

        {parsed ? (
          parsed.errors.length && parsed.rows.length === 0 ? (
            <p className="text-sm text-destructive">{parsed.errors[0]?.message}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm">
                {parsed.rows.length.toLocaleString("en-IN")} row(s) parsed
                {parsed.errors.length ? `, ${parsed.errors.length} skipped (missing fields)` : ""}
              </span>
              <Button size="sm" disabled={importing || parsed.rows.length === 0} onClick={() => void runImport()}>
                {importing ? <Loader2 className="size-4 animate-spin" /> : null} Import
              </Button>
            </div>
          )
        ) : null}

        {result ? (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-500">{result.matched.toLocaleString("en-IN")} matched</Badge>
              {result.unmatched_in_csv > 0 ? (
                <Badge variant="outline" className="border-destructive text-destructive">
                  {result.unmatched_in_csv.toLocaleString("en-IN")} unmatched in this file
                </Badge>
              ) : null}
              <Badge variant="secondary">
                {result.wards_with_app_key.toLocaleString("en-IN")} / {result.total_active_wards.toLocaleString("en-IN")} wards mapped overall
              </Badge>
            </div>
            {result.unmatched_rows.length ? (
              <div>
                <Button variant="outline" size="sm" onClick={downloadUnmatched}>
                  <Download className="size-4" /> Download unmatched rows
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.unmatched_truncated
                    ? `Showing the first ${result.unmatched_rows.length} — fix these, re-export, and re-upload.`
                    : "Fix these rows, re-export, and re-upload."}
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto text-xs text-muted-foreground">
                  {result.unmatched_rows.slice(0, 8).map((u, i) => (
                    <li key={i}>
                      Line {u.line}: {u.reason} — {u.row.district} / {u.row.panchayat_samiti} /{" "}
                      {u.row.gram_panchayat} / वार्ड {u.row.ward_number}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
