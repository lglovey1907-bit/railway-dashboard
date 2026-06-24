// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets live-fetch utility
//
// Works with any PUBLIC Google Sheet ("Anyone with the link → Viewer").
// Converts a normal share URL into the CSV export endpoint and parses it
// into an array of row objects keyed by the sheet's header row.
//
// Expected sheet format:
// First row = headers (must include a"Code"or"Station Code"column
// that matches the station code used elsewhere in the dashboard, e.g. NDLS).
// Every other column is freeform — the dashboard will show whatever is
// present, and"NA"for any field a card expects but the sheet doesn't have.
// ─────────────────────────────────────────────────────────────────────────────

export interface SheetRow {
 [column: string]: string;
}

export interface SheetFetchResult {
 rows: SheetRow[];
 headers: string[];
 fetchedAt: string;
 error?: string;
}

/** Converts any standard Google Sheets share URL into its public CSV export URL.
 * Uses the gviz/tq endpoint (Google Visualization API) rather than /export?format=csv
 * because it works reliably for anonymous (no-cookie) requests and also for
 * Excel (.xlsx) files uploaded to Drive that Google has indexed as a Sheet,
 * not just native Google Sheets. */
export function toCsvExportUrl(shareUrl: string, gid?: string): string | null {
 try {
 const m = shareUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
 if (!m) return null;
 const sheetId = m[1];
 const gidMatch = shareUrl.match(/[?&#]gid=([0-9]+)/);
 const resolvedGid = gid ?? gidMatch?.[1] ?? '0';
 return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${resolvedGid}`;
 } catch {
 return null;
 }
}

/** Legacy export endpoint, kept as an automatic fallback if gviz fails. */
function toLegacyExportUrl(shareUrl: string, gid?: string): string | null {
 try {
 const m = shareUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
 if (!m) return null;
 const sheetId = m[1];
 const gidMatch = shareUrl.match(/[?&#]gid=([0-9]+)/);
 const resolvedGid = gid ?? gidMatch?.[1] ?? '0';
 return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${resolvedGid}`;
 } catch {
 return null;
 }
}

/** Minimal CSV parser — handles quoted fields and commas within quotes. */
function parseCsv(text: string): string[][] {
 const rows: string[][] = [];
 let row: string[] = [];
 let field = '';
 let inQuotes = false;

 for (let i = 0; i < text.length; i++) {
 const char = text[i];
 const next = text[i + 1];

 if (inQuotes) {
 if (char === '"' && next === '"') { field += '"'; i++; }
 else if (char === '"') { inQuotes = false; }
 else { field += char; }
 } else {
 if (char === '"') inQuotes = true;
 else if (char === ',') { row.push(field); field = ''; }
 else if (char === '\n' || char === '\r') {
 if (char === '\r' && next === '\n') i++;
 row.push(field);
 rows.push(row);
 row = [];
 field = '';
 } else {
 field += char;
 }
 }
 }
 if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
 return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

/** Fetches and parses a public Google Sheet into row objects keyed by header. */
async function tryFetchCsv(url: string): Promise<{ text: string } | { error: string; status?: number }> {
 try {
 const res = await fetch(url, { cache: 'no-store' });
 if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
 const text = await res.text();
 // Google sometimes returns an HTML"sign in"or"permission"page with a 200 status —
 // detect that case so it doesn't get silently parsed as one giant garbage CSV row.
 if (text.trim().startsWith('<')) return { error: 'Received an HTML page instead of CSV data (likely a permissions/login wall)' };
 return { text };
 } catch (err) {
 return { error: err instanceof Error ? err.message : 'Network error' };
 }
}

export async function fetchGoogleSheet(shareUrl: string): Promise<SheetFetchResult> {
 const sheetIdMatch = shareUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
 if (!sheetIdMatch) {
 return { rows: [], headers: [], fetchedAt: new Date().toISOString(), error: 'Invalid Google Sheets URL — could not find a spreadsheet ID in the link' };
 }

 const gviz = toCsvExportUrl(shareUrl);
 const legacy = toLegacyExportUrl(shareUrl);

 // Try the gviz endpoint first (works best for anonymous fetches + uploaded Excel files)
 let result = gviz ? await tryFetchCsv(gviz) : { error: 'Could not build request URL' };
 let text: string | null = 'text' in result ? result.text : null;

 // Fall back to the legacy /export endpoint if gviz failed
 if (!text && legacy) {
 const fallback = await tryFetchCsv(legacy);
 if ('text' in fallback) text = fallback.text;
 else if (!('error' in result)) result = fallback;
 }

 if (!text) {
 const errMsg = 'error' in result ? result.error : 'Unknown error';
 return {
 rows: [], headers: [], fetchedAt: new Date().toISOString(),
 error: `Could not read sheet (${errMsg}). Check: 1) Sharing is"Anyone with the link → Viewer", 2) the link is the full spreadsheet URL (not a folder), 3) if this is an uploaded Excel file, try opening it in Drive once with"Open with Google Sheets"first.`,
 };
 }

 try {
 const matrix = parseCsv(text);
 if (matrix.length === 0) {
 return { rows: [], headers: [], fetchedAt: new Date().toISOString(), error: 'Sheet appears to be empty' };
 }
 const headers = matrix[0].map(h => h.trim());
 const rows: SheetRow[] = matrix.slice(1).map(line => {
 const obj: SheetRow = {};
 headers.forEach((h, i) => { obj[h] = (line[i] ?? '').trim(); });
 return obj;
 });
 return { rows, headers, fetchedAt: new Date().toISOString() };
 } catch (err) {
 return {
 rows: [], headers: [], fetchedAt: new Date().toISOString(),
 error: err instanceof Error ? err.message : 'Failed to fetch sheet (network/CORS error)',
 };
 }
}

/**
 * Finds the row matching a station code, checking common header name variants.
 * Returns null if no matching row.
 */
export function findRowByCode(rows: SheetRow[], code: string): SheetRow | null {
 const codeKeys = ['Code', 'Station Code', 'StationCode', 'station_code', 'CODE'];
 for (const row of rows) {
 for (const key of codeKeys) {
 if (row[key] && row[key].toUpperCase() === code.toUpperCase()) return row;
 }
 }
 return null;
}

/**
 * Reads a field from a sheet row using several possible header aliases.
 * Returns 'NA' if none of the aliases exist or the value is blank —
 * this satisfies the"missing field shows NA, never an error"requirement.
 */
export function readField(row: SheetRow | null | undefined, aliases: string[]): string {
 if (!row) return 'NA';
 for (const alias of aliases) {
 const val = row[alias];
 if (val !== undefined && val.trim() !== '') return val.trim();
 }
 return 'NA';
}
