// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets Integration
//
// Reads a publicly-published Google Sheet (CSV format) and syncs new rows
// as pending users into the staffDB.  No API key required — user must publish
// their sheet via: File → Share → Publish to web → CSV format.
//
// CSV URL format:
//   https://docs.google.com/spreadsheets/d/{ID}/pub?output=csv
//   https://docs.google.com/spreadsheets/d/{ID}/export?format=csv
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_KEY = 'rly_gsheet_config';
const IMPORTED_KEY = 'rly_gsheet_imported_emails'; // emails already synced

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GSheetColumnMap {
 name: number;
 email: number;
 hrmsId?: number;
 mobile?: number;
 designation?: number;
 workingAs?: number;
 cell?: number;
 role?: number;
}

export interface GSheetConfig {
 csvUrl: string;
 columnMap: GSheetColumnMap;
 hasHeader: boolean;
 autoSync: boolean;
 detectedHeaders?: string[];
 lastSyncAt?: string;
 lastRowCount?: number;
 connectedAt?: string;
}

export interface SyncResult {
 added: number;
 skipped: number;
 error?: string;
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

// ── CSV parser (handles quoted fields + commas inside quotes) ─────────────────

export function parseCSV(text: string): string[][] {
 const rows: string[][] = [];
 for (const raw of text.split('\n')) {
  const line = raw.replace(/\r$/, '');
  if (!line.trim()) continue;
  const cols: string[] = [];
  let inQ = false, cur = '';
  for (let i = 0; i < line.length; i++) {
   const c = line[i];
   if (c === '"') {
    if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
    else inQ = !inQ;
    continue;
   }
   if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
   cur += c;
  }
  cols.push(cur.trim());
  rows.push(cols);
 }
 return rows;
}

// ── Column auto-detection from sheet headers ──────────────────────────────────

const FIELD_ALIASES: Record<keyof GSheetColumnMap, string[]> = {
 name: ['name', 'fullname', 'employeename', 'staffname', 'employeefullname'],
 email: ['email', 'emailaddress', 'mail', 'e-mail'],
 hrmsId: ['hrmsid', 'hrms', 'empid', 'employeeid', 'empno', 'hrmsnumber', 'staffid'],
 mobile: ['mobile', 'phone', 'contact', 'mobileno', 'phonenumber', 'contactno'],
 designation: ['designation', 'post', 'grade', 'rank', 'jobtitle', 'position'],
 workingAs: ['workingas', 'workingrole', 'category', 'type', 'stafftype'],
 cell: ['cell', 'department', 'section', 'unit', 'branch', 'office'],
 role: ['role', 'accessrole', 'systemrole', 'userrole'],
};

export function autoDetectColumns(headers: string[]): Partial<GSheetColumnMap> {
 const normalized = headers.map(h => h.toLowerCase().replace(/[\s_\-/]/g, ''));
 const result: Partial<GSheetColumnMap> = {};
 for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof GSheetColumnMap, string[]][]) {
  for (const alias of aliases) {
   const idx = normalized.findIndex(n => n === alias || n.includes(alias));
   if (idx >= 0) { result[field] = idx; break; }
  }
 }
 return result;
}

// ── Fetch the published CSV ───────────────────────────────────────────────────

export interface SheetFetchResult {
 headers: string[];
 rows: string[][];
 error?: string;
}

export async function fetchSheetData(csvUrl: string): Promise<SheetFetchResult> {
 try {
  // Route through our server-side proxy to avoid browser CORS restrictions
  const proxyUrl = `/api/gsheet-proxy?url=${encodeURIComponent(csvUrl)}`;
  const res = await fetch(proxyUrl, { cache: 'no-store' });

  if (!res.ok) {
   // Proxy returns JSON errors
   let msg = `HTTP ${res.status}`;
   try { const j = await res.json(); msg = j.error ?? msg; } catch {}
   throw new Error(msg);
  }

  const text = await res.text();
  const all = parseCSV(text);
  if (all.length === 0) return { headers: [], rows: [] };
  return { headers: all[0], rows: all.slice(1) };
 } catch (e: any) {
  return { headers: [], rows: [], error: e.message ?? 'Network error' };
 }
}

// ── Extract a URL for the "publish to CSV" link ──────────────────────────────

/** Normalise any Google Sheets URL to the CSV export URL */
export function normaliseSheetUrl(input: string): string {
 const trimmed = input.trim();
 // Already a CSV export or pub URL
 if (trimmed.includes('output=csv') || trimmed.includes('pub?output')) return trimmed;
 // Extract sheet ID from standard edit URL
 const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
 if (m) {
  const gid = trimmed.match(/[?&]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
 }
 return trimmed; // Return as-is and let fetch fail with a useful error
}

// ── Main sync function ────────────────────────────────────────────────────────

export async function syncGoogleSheet(
 config: GSheetConfig,
 existingEmails: Set<string>,
 addUser: (row: Record<string, string>) => void,
): Promise<SyncResult> {
 const { rows, error } = await fetchSheetData(config.csvUrl);
 if (error) return { added: 0, skipped: 0, error };

 const m = config.columnMap;
 const imported = getImportedEmails();
 let added = 0, skipped = 0;

 const get = (row: string[], idx?: number) =>
  idx !== undefined && idx >= 0 ? (row[idx]?.trim() ?? '') : '';

 for (const row of rows) {
  const email = get(row, m.email).toLowerCase();
  if (!email) { skipped++; continue; }
  // Skip already imported or already existing users
  if (imported.has(email) || existingEmails.has(email)) { skipped++; continue; }

  const name = get(row, m.name);
  if (!name) { skipped++; continue; }

  try {
   addUser({
    name,
    email,
    hrmsId: get(row, m.hrmsId),
    mobile: get(row, m.mobile),
    designation: get(row, m.designation) || 'Staff',
    workingAs: get(row, m.workingAs),
    cell: get(row, m.cell) || '',
    role: get(row, m.role) || 'user',
   });
   markEmailImported(email);
   added++;
  } catch { skipped++; }
 }

 saveGSheetConfig({
  ...config,
  lastSyncAt: new Date().toISOString(),
  lastRowCount: rows.length,
 });

 return { added, skipped };
}
