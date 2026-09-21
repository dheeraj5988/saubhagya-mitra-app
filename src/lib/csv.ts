/**
 * Minimal but correct CSV reader: handles quoted fields, embedded commas,
 * escaped quotes (""), CRLF, and a UTF-8 BOM. Never a naive comma split.
 */
export function parseCsvText(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type GeoCsvRow = {
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  voter_count: number;
};

export type GeoCsvError = { line: number; message: string };

export type GeoCsvResult = {
  rows: GeoCsvRow[];
  errors: GeoCsvError[];
  headerFound: boolean;
};

const COLUMN_ALIASES: Record<keyof GeoCsvRow, string[]> = {
  district: ["district", "जिला", "district name"],
  panchayat_samiti: ["panchayat samiti", "panchayatsamiti", "block", "samiti", "पंचायत समिति"],
  gram_panchayat: ["gram panchayat", "grampanchayat", "gp", "ग्राम पंचायत"],
  ward_number: ["ward", "ward no", "ward number", "ward_number", "वार्ड"],
  voter_count: ["voter count", "voters", "voter_count", "votercount", "total voters", "मतदाता"],
};

function normalise(value: string) {
  return value.replace(/^\ufeff/, "").trim().toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");
}

/** Maps loose header names to our five logical columns. */
function resolveHeader(cells: string[]) {
  const map: Partial<Record<keyof GeoCsvRow, number>> = {};
  cells.forEach((cell, index) => {
    const key = normalise(cell);
    (Object.keys(COLUMN_ALIASES) as (keyof GeoCsvRow)[]).forEach((column) => {
      if (map[column] === undefined && COLUMN_ALIASES[column].includes(key)) map[column] = index;
    });
  });
  const missing = (Object.keys(COLUMN_ALIASES) as (keyof GeoCsvRow)[]).filter(
    (column) => map[column] === undefined,
  );
  return { map, missing };
}

export const GEO_CSV_HEADER = "District,Panchayat Samiti,Gram Panchayat,Ward,Voter count";

/**
 * Parses a geography sheet. A header row is expected but a headerless file with
 * five columns in the documented order is accepted too.
 */
export function parseGeoCsv(text: string): GeoCsvResult {
  const table = parseCsvText(text);
  if (!table.length) return { rows: [], errors: [{ line: 0, message: "File is empty." }], headerFound: false };

  const first = table[0]!;
  const { map, missing } = resolveHeader(first);
  let index: Record<keyof GeoCsvRow, number>;
  let start = 1;
  let headerFound = true;

  if (missing.length === 0) {
    index = map as Record<keyof GeoCsvRow, number>;
  } else if (first.length >= 5) {
    headerFound = false;
    start = 0;
    index = {
      district: 0,
      panchayat_samiti: 1,
      gram_panchayat: 2,
      ward_number: 3,
      voter_count: 4,
    };
  } else {
    return {
      rows: [],
      errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}. Expected header: ${GEO_CSV_HEADER}` }],
      headerFound: false,
    };
  }

  const rows: GeoCsvRow[] = [];
  const errors: GeoCsvError[] = [];

  for (let r = start; r < table.length; r++) {
    const cells = table[r]!;
    const line = r + 1;
    const get = (key: keyof GeoCsvRow) => (cells[index[key]] ?? "").trim();

    const district = get("district");
    const samiti = get("panchayat_samiti");
    const gp = get("gram_panchayat");
    const ward = get("ward_number");
    const rawVoters = get("voter_count").replace(/[, ]/g, "");

    const blanks = [
      !district && "District",
      !samiti && "Panchayat Samiti",
      !gp && "Gram Panchayat",
      !ward && "Ward",
    ].filter(Boolean) as string[];
    if (blanks.length) {
      errors.push({ line, message: `Missing ${blanks.join(", ")}` });
      continue;
    }
    if (rawVoters === "") {
      errors.push({ line, message: "Voter count is empty" });
      continue;
    }
    const voters = Number(rawVoters);
    if (!Number.isFinite(voters) || voters < 0 || !Number.isInteger(voters)) {
      errors.push({ line, message: `Invalid voter count "${get("voter_count")}"` });
      continue;
    }
    if (voters > 1_000_000) {
      errors.push({ line, message: `Voter count out of range (${voters})` });
      continue;
    }
    if (district.length > 120 || samiti.length > 120 || gp.length > 120 || ward.length > 20) {
      errors.push({ line, message: "A value is too long" });
      continue;
    }

    rows.push({
      district,
      panchayat_samiti: samiti,
      gram_panchayat: gp,
      ward_number: ward,
      voter_count: voters,
    });
  }

  return { rows, errors, headerFound };
}

/** Wards sort numerically when they are numbers, alphabetically otherwise. */
export function compareWardNumbers(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "hi", { numeric: true });
}

// ---------------------------------------------------------------------------
// Ward mapping CSV (district, panchayat_samiti, gram_panchayat, ward_number,
// app_key) — links a website ward to the desk app's own ward key.
// ---------------------------------------------------------------------------

export type WardMappingCsvRow = {
  district: string;
  panchayat_samiti: string;
  gram_panchayat: string;
  ward_number: string;
  app_key: string;
};

export type WardMappingCsvResult = {
  rows: WardMappingCsvRow[];
  errors: GeoCsvError[];
};

const WARD_MAPPING_ALIASES: Record<keyof WardMappingCsvRow, string[]> = {
  district: ["district", "जिला"],
  panchayat_samiti: ["panchayat_samiti", "panchayat samiti", "samiti", "block", "पंचायत समिति"],
  gram_panchayat: ["gram_panchayat", "gram panchayat", "gp", "ग्राम पंचायत"],
  ward_number: ["ward_number", "ward number", "ward", "वार्ड"],
  app_key: ["app_key", "app key", "ward_key", "ward key", "desk key", "key"],
};

export const WARD_MAPPING_CSV_HEADER =
  "district,panchayat_samiti,gram_panchayat,ward_number,app_key";

/** Parses the desk-app ward export used to fill geo_wards.app_key. */
export function parseWardMappingCsv(text: string): WardMappingCsvResult {
  const table = parseCsvText(text);
  if (!table.length) return { rows: [], errors: [{ line: 0, message: "File is empty." }] };

  const first = table[0]!;
  const map: Partial<Record<keyof WardMappingCsvRow, number>> = {};
  first.forEach((cell, index) => {
    const key = normalise(cell);
    (Object.keys(WARD_MAPPING_ALIASES) as (keyof WardMappingCsvRow)[]).forEach((column) => {
      if (map[column] === undefined && WARD_MAPPING_ALIASES[column].includes(key)) map[column] = index;
    });
  });
  const missing = (Object.keys(WARD_MAPPING_ALIASES) as (keyof WardMappingCsvRow)[]).filter(
    (column) => map[column] === undefined,
  );
  if (missing.length) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Missing column(s): ${missing.join(", ")}. Expected header: ${WARD_MAPPING_CSV_HEADER}`,
        },
      ],
    };
  }

  const index = map as Record<keyof WardMappingCsvRow, number>;
  const rows: WardMappingCsvRow[] = [];
  const errors: GeoCsvError[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r]!;
    const line = r + 1;
    const get = (key: keyof WardMappingCsvRow) => (cells[index[key]] ?? "").trim();
    const row: WardMappingCsvRow = {
      district: get("district"),
      panchayat_samiti: get("panchayat_samiti"),
      gram_panchayat: get("gram_panchayat"),
      ward_number: get("ward_number"),
      app_key: get("app_key"),
    };
    if (Object.values(row).every((v) => v === "")) continue; // blank line

    const blanks = (Object.keys(row) as (keyof WardMappingCsvRow)[]).filter((k) => row[k] === "");
    if (blanks.length) {
      errors.push({ line, message: `Missing ${blanks.join(", ")}` });
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}
