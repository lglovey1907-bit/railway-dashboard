// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets Integration — gviz/tq approach
//
// Uses Google's Visualization Query API (gviz/tq) endpoint which works for ANY
// sheet shared as "Anyone with the link can view".
// NO publishing, NO CSV export, NO API key required.
//
// User just: Share → Anyone with the link → Copy link → Paste here.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_KEY    = 'rly_gsheet_config';
const IMPORTED_KEY  = 'rly_gsheet_imported_emails';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GSheetColumnMap {
 name:          number;
 email:         number;
 hrmsId?:       number;
 mobile?:       number;
 designation?:  number;
 workingAs?:    number;
 cell?:         number;
 role?:         number;
}

export interface GSheetConfig {
 sheetUrl:          string;   // original URL the user pasted
 gvizUrl:           string;   // normalised gviz/tq URL used for fetching
 columnMap:         GSheetColumnMap;
 autoSync:          boolean;
 detectedHeaders?:  string[];
 lastSyncAt?:       string;
 lastRowCount?:     number;
 connectedAt?:      string;
}

export interface SyncResult {
 added:   number;
 skipped: number;
 error?:  string;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export function getGSheetConfig(): GSheetConfig | null {
 if (typeof window === 'undefined') return null;
 try { return JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null'); } catch { return null; }
}

export function saveGSheetConfig(config: GSheetConfig): void {
 if (typeof window === 'undefined') return;
 localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearGSheetConfig(): void {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(CONFIG_KEY);
 localStorage.removeItem(IMPORTED_KEY);
}

function getImportedEmails(): Set<string> {
 if (typeof window === 'undefined') return new Set();
 try { return new Set(JSON.parse(localStorage.getItem(IMPORTED_KEY) ?? '[]')); } catch { return new Set(); }
}

function markEmailImported(email: string): void {
 if (typeof window === 'undefined') return;
 const s = getImportedEmails();
 s.add(email.toLowerCase());
 localStorage.setItem(IMPORTED_KEY, JSON.stringify(Array.from(s)));
}

// ── URL normalisation — any Sheets link → gviz/tq ────────────────────────────

/**
 * Convert any Google Sheets URL into the gviz/tq JSON endpoint.
 * Works for /edit, /view, /pub, share links, and gviz links already.
 */
export function normaliseSheetUrl(input: string): string {
 const trimmed = input.trim();

 // Already a gviz URL
 if (trimmed.includes('gviz/tq')) return trimmed;

 // Extract spreadsheet ID
 const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
 if (!idMatch) return trimmed; // can't normalise — return as-is

 const sheetId = idMatch[1];
 const gid     = trimmed.match(/[?&]gid=(\d+)/)?.[1];

 let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
 if (gid) url += `&gid=${gid}`;
 return url;
}

// ── gviz/tq response parser ───────────────────────────────────────────────────

interface GvizTable {
 cols: { id: string; label: string; type: string }[];
 rows: { c: ({ v: unknown; f?: string } | null)[] }[];
}

function parseGvizText(text: string): { headers: string[]; rows: string[][] } {
 // Strip JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
 const jsonStr = text
  .replace(/^[^(]+\(/, '') // remove everything up to and including first '('
  .replace(/\);\s*$/, ''); // remove trailing ');'

 const data = JSON.parse(jsonStr);
 if (data.status === 'error') {
  const msg = data.errors?.[0]?.detailed_message ?? data.errors?.[0]?.message ?? 'Sheet access denied';
  throw new Error(msg);
 }

 const table: GvizTable = data.table;
 const headers = table.cols.map(c => c.label || c.id || '');

 const rows = (table.rows ?? []).map(row =>
  table.cols.map((_, ci) => {
   const cell = row.c?.[ci];
   if (!cell || cell.v === null || cell.v === undefined) return '';
   // Dates come as "Date(2024,0,15)" — convert to readable string
   const v = cell.v;
   if (typeof v === 'string' && v.startsWith('Date(')) {
    try {
     const parts = v.slice(5, -1).split(',').map(Number);
     return new Date(parts[0], parts[1], parts[2]).toISOString().slice(0, 10);
    } catch { return cell.f ?? String(v); }
   }
   return cell.f ?? String(v);
  })
 );

 return { headers, rows };
}

// ── Column auto-detection ─────────────────────────────────────────────────────

const FIELD_ALIASES: Record<keyof GSheetColumnMap, string[]> = {
 name:        ['name', 'fullname', 'employeename', 'staffname'],
 email:       ['email', 'emailaddress', 'mail', 'e-mail'],
 hrmsId:      ['hrmsid', 'hrms', 'empid', 'employeeid', 'empno', 'staffid'],
 mobile:      ['mobile', 'phone', 'contact', 'mobileno', 'phoneno'],
 designation: ['designation', 'post', 'grade', 'rank', 'jobtitle'],
 workingAs:   ['workingas', 'workingrole', 'category', 'type', 'stafftype'],
 cell:        ['cell', 'department', 'section', 'unit', 'branch', 'office'],
 role:        ['role', 'accessrole', 'systemrole', 'userrole'],
};

export function autoDetectColumns(headers: string[]): Partial<GSheetColumnMap> {
 const norm = headers.map(h => h.toLowerCase().replace(/[\s_\-/]/g, ''));
 const result: Partial<GSheetColumnMap> = {};
 for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof GSheetColumnMap, string[]][]) {
  for (const alias of aliases) {
   const idx = norm.findIndex(n => n === alias || n.includes(alias));
   if (idx >= 0) { result[field] = idx; break; }
  }
 }
 return result;
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export interface SheetFetchResult {
 headers: string[];
 rows:    string[][];
 error?:  string;
}

export async function fetchSheetData(gvizUrl: string): Promise<SheetFetchResult> {
 try {
  // Server-side proxy avoids CORS and handles auth redirects properly
  const proxyUrl = `/api/gsheet-proxy?url=${encodeURIComponent(gvizUrl)}`;
  const res = await fetch(proxyUrl, { cache: 'no-store' });

  const contentType = res.headers.get('content-type') ?? '';

  if (!res.ok) {
   let msg = `HTTP ${res.status}`;
   try {
    if (contentType.includes('json')) { const j = await res.json(); msg = j.error ?? msg; }
    else msg = (await res.text()).slice(0, 200) || msg;
   } catch {}
   throw new Error(msg);
  }

  const text = await res.text();
  const { headers, rows } = parseGvizText(text);
  return { headers, rows };
 } catch (e: any) {
  return { headers: [], rows: [], error: e.message ?? 'Network error' };
 }
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function syncGoogleSheet(
 config: GSheetConfig,
 existingEmails: Set<string>,
 addUser: (row: Record<string, string>) => void,
): Promise<SyncResult> {
 const { rows, error } = await fetchSheetData(config.gvizUrl);
 if (error) return { added: 0, skipped: 0, error };

 const m        = config.columnMap;
 const imported = getImportedEmails();
 let added = 0, skipped = 0;

 const get = (row: string[], idx?: number) =>
  idx !== undefined && idx >= 0 ? (row[idx]?.trim() ?? '') : '';

 for (const row of rows) {
  const email = get(row, m.email).toLowerCase();
  if (!email) { skipped++; continue; }
  if (imported.has(email) || existingEmails.has(email)) { skipped++; continue; }

  const name = get(row, m.name);
  if (!name) { skipped++; continue; }

  try {
   addUser({
    name,
    email,
    hrmsId:      get(row, m.hrmsId),
    mobile:      get(row, m.mobile),
    designation: get(row, m.designation) || 'Staff',
    workingAs:   get(row, m.workingAs),
    cell:        get(row, m.cell) || '',
    role:        get(row, m.role) || 'user',
   });
   markEmailImported(email);
   added++;
  } catch { skipped++; }
 }

 saveGSheetConfig({
  ...config,
  lastSyncAt:   new Date().toISOString(),
  lastRowCount: rows.length,
 });

 return { added, skipped };
}
