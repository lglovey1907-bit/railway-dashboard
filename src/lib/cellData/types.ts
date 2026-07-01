// ─────────────────────────────────────────────────────────────────────────────
// Cell Data Engine — Complete Type System v2
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType =
 | 'text' | 'number' | 'currency' | 'date' | 'dropdown'
 | 'checkbox' | 'email' | 'url' | 'phone' | 'formula' | 'multiselect';

export interface DropdownOption { label: string; value: string; color?: string; }

export interface FieldDef {
 id: string;
 label: string;
 type: FieldType;
 width: number;
 nominatedUserIds: string[];
 // dropdown / multiselect
 options?: DropdownOption[];
 defaultValue?: string;
 // formula
 formula?: string;
 // validation
 required?: boolean;
 // display
 wrapText?: boolean; // wrap long text (default: auto for text fields, off for others)
 autoHeight?: boolean; // row height expands with content (default: true when wrapText on)
 frozen?: boolean; // freeze/pin column to left edge
 hidden?: boolean; // hide column from view
}

export interface RowDef {
 id: string;
 nominatedUserIds: string[];
 order: number; // for drag-reorder
 deletedAt?: string; // soft-delete timestamp
}

// ── Undo / Redo history entry ─────────────────────────────────────────────────
export interface HistoryEntry {
 id: string;
 timestamp: string;
 description: string;
 snapshot: CellWorkspace; // full workspace snapshot before the change
}

export interface TrashEntry {
 id: string;
 deletedAt: string;
 type: 'table' | 'row' | 'column' | 'section';
 label: string;
 data: unknown; // serialised deleted item
 parentId?: string; // tableId for row/column deletion
}

// ── Sheet connection ──────────────────────────────────────────────────────────
export interface SheetConnection {
 url: string;
 mode: 'import' | 'link'; // import = one-time copy; link = live sync
 lastSynced?: string;
 syncError?: string;
 autoSyncIntervalMinutes?: number; // 0 = manual only
}

export interface TableDef {
 id: string;
 name: string;
 firstColLabel: string;
 fields: FieldDef[];
 rows: RowDef[];
 values: Record<string, string>; // key: `rowId:fieldId`
 nominatedUserIds: string[];
 viewerIds?: string[]; // staff granted read-only (view) access to this whole table
 editorIds?: string[]; // staff granted edit access to this whole table (in addition to nominatedUserIds/data-entry)
 ownerCell: string; // NEW: originating cell — always the owner
 dataSource: 'manual' | 'linked_sheet';
 sheet?: SheetConnection;
 // sort / filter (persisted)
 sortField?: string;
 sortDir?: 'asc' | 'desc';
 filters?: Record<string, string>;
 columnOrder?: string[];
 locked?: boolean; // NEW: locked tables block edits
}

// ── Widgets ───────────────────────────────────────────────────────────────────
export interface TextWidget { type: 'text'; id: string; content: string; }
export interface TableWidget { type: 'table'; id: string; tableId: string; }
export interface KpiWidget { type: 'kpi'; id: string; label: string; value: string; suffix?: string; }
export type Widget = TableWidget | TextWidget | KpiWidget;

export interface Section {
 id: string; title: string; collapsed: boolean; widgets: Widget[]; order: number;
}

export interface CellWorkspace {
 cell: string;
 sections: Section[];
 tables: TableDef[];
 trash: TrashEntry[];
}

// ── Validation ────────────────────────────────────────────────────────────────
export interface ValidationResult { valid: boolean; error?: string; }

export function validateValue(value: string, field: FieldDef): ValidationResult {
 const v = value.trim();
 if (!v) return { valid: true }; // empty is OK unless required
 switch (field.type) {
 case 'number':
 case 'currency':
 if (isNaN(Number(v))) return { valid: false, error: `"${v}"is not a valid number` };
 return { valid: true };
 case 'date':
 if (isNaN(Date.parse(v))) return { valid: false, error: `"${v}"is not a valid date` };
 return { valid: true };
 case 'email':
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { valid: false, error: 'Enter a valid email address' };
 return { valid: true };
 case 'url':
 try { new URL(v.startsWith('http') ? v : `https://${v}`); return { valid: true }; }
 catch { return { valid: false, error: 'Enter a valid URL' }; }
 case 'phone':
 if (!/^[+\d][\d\s\-().]{6,}$/.test(v)) return { valid: false, error: 'Enter a valid phone number' };
 return { valid: true };
 default:
 return { valid: true };
 }
}

// ── Formula engine ────────────────────────────────────────────────────────────
export function evalFormula(
 formula: string,
 table: TableDef,
 rowId: string,
 allValues: Record<string, string>,
): string {
 try {
 let expr = formula.trim();

 // Replace column label refs like {Quantity} with their value for this row
 const colRefs = expr.match(/\{([^}]+)\}/g) ?? [];
 colRefs.forEach(ref => {
 const label = ref.slice(1, -1);
 const field = table.fields.find(f => f.label === label);
 const val = field ? (allValues[`${rowId}:${field.id}`] ?? '0') : '0';
 expr = expr.replace(ref, isNaN(Number(val)) ? `"${val}"` : val);
 });

 // Named functions
 expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) =>
 args.split(',').reduce((s: number, v: string) => s + (Number(v.trim()) || 0), 0).toString()
 );
 expr = expr.replace(/AVERAGE\(([^)]+)\)/gi, (_, args) => {
 const nums = args.split(',').map((v: string) => Number(v.trim()) || 0);
 return (nums.reduce((s: number, n: number) => s + n, 0) / nums.length).toString();
 });
 expr = expr.replace(/COUNT\(([^)]+)\)/gi, (_, args) =>
 args.split(',').filter((v: string) => v.trim() !== '').length.toString()
 );
 expr = expr.replace(/MIN\(([^)]+)\)/gi, (_, args) =>
 Math.min(...args.split(',').map((v: string) => Number(v.trim()) || 0)).toString()
 );
 expr = expr.replace(/MAX\(([^)]+)\)/gi, (_, args) =>
 Math.max(...args.split(',').map((v: string) => Number(v.trim()) || 0)).toString()
 );
 expr = expr.replace(/ROUND\(([^,]+),([^)]+)\)/gi, (_, v, d) =>
 Number(Number(v.trim()).toFixed(Number(d.trim()))).toString()
 );
 expr = expr.replace(/CONCAT\(([^)]+)\)/gi, (_, args) =>
 args.split(',').map((v: string) => v.trim().replace(/^"|"$/g, '')).join('')
 );
 expr = expr.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi, (_, cond, t, f) => {
 // eslint-disable-next-line no-eval
 return eval(cond.trim()) ? t.trim() : f.trim();
 });
 expr = expr.replace(/TODAY\(\)/gi, new Date().toISOString().slice(0, 10));

 // eslint-disable-next-line no-eval
 const result = eval(expr);
 return result === undefined || result === null ? '' : String(result);
 } catch {
 return '#ERR';
 }
}

// ── Permissions ───────────────────────────────────────────────────────────────
export function canFill(
 userId: string | undefined, canManage: boolean,
 table: TableDef, row: RowDef, field: FieldDef,
): boolean {
 if (canManage) return true;
 if (!userId) return false;
 return table.nominatedUserIds.includes(userId)
 || (table.editorIds ?? []).includes(userId)
 || row.nominatedUserIds.includes(userId)
 || field.nominatedUserIds.includes(userId);
}

/** Whether a user can open/view a table (read-only if not also an editor). */
export function canViewTable(userId: string | undefined, canManage: boolean, table: TableDef): boolean {
 if (canManage) return true;
 if (!userId) return false;
 const viewers = table.viewerIds ?? [];
 const editors = table.editorIds ?? [];
 // No viewers/editors configured → table is open to everyone in the cell (legacy behaviour)
 if (viewers.length === 0 && editors.length === 0 && table.nominatedUserIds.length === 0) return true;
 return viewers.includes(userId) || editors.includes(userId) || table.nominatedUserIds.includes(userId);
}

/** Whether a user can edit a table's structure/values at the whole-table level. */
export function canEditTable(userId: string | undefined, canManage: boolean, table: TableDef): boolean {
 if (canManage) return true;
 if (!userId) return false;
 return (table.editorIds ?? []).includes(userId) || table.nominatedUserIds.includes(userId);
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
 text: 'Text', number: 'Number', currency: 'Currency (₹)', date: 'Date',
 dropdown: 'Dropdown', multiselect: 'Multi-select', checkbox: 'Checkbox',
 email: 'Email', url: 'URL / Link', phone: 'Phone', formula: 'Formula',
};

function genId(p: string) { return `${p}${Date.now()}${Math.floor(Math.random()*1000)}`; }

// Labels that strongly suggest long text — wrap on by default
const LONG_TEXT_LABELS = /remark|note|description|observation|instruction|comment|detail|reason|summary|address|feedback/i;

export function makeField(label = 'New Column', type: FieldType = 'text'): FieldDef {
 const autoWrap = type === 'text' && LONG_TEXT_LABELS.test(label);
 return {
 id: genId('f'), label, type, width: autoWrap ? 240 : 160,
 nominatedUserIds: [], wrapText: autoWrap, autoHeight: autoWrap,
 };
}
export function makeRow(order = 0): RowDef {
 return { id: genId('r'), nominatedUserIds: [], order };
}
export function makeSection(title = 'New Section'): Section {
 return { id: genId('s'), title, collapsed: false, widgets: [], order: 0 };
}
export function makeTable(
 name: string, cols: number, rows: number, firstColLabel = 'Label', ownerCell = '',
 viewerIds: string[] = [], editorIds: string[] = [],
): TableDef {
 const fields = Array.from({ length: cols }, (_, i) => makeField(`Column ${i + 1}`));
 const rowDefs = Array.from({ length: rows }, (_, i) => makeRow(i));
 return {
 id: genId('t'), name, firstColLabel, ownerCell, fields, rows: rowDefs,
 values: {}, nominatedUserIds: [], viewerIds, editorIds, dataSource: 'manual',
 sortField: undefined, sortDir: undefined, filters: {}, columnOrder: fields.map(f => f.id),
 };
}
export function makeDraftTrashId() { return genId('trash'); }
export function makeHistoryId() { return genId('hist'); }
