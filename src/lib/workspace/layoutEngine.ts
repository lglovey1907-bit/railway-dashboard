import { syncedSave, syncedLoad, newerWins, NS } from '@/lib/config/SyncManager';
import { sharedWrite } from '@/lib/config/sharedSync';
// ─────────────────────────────────────────────────────────────────────────────
// Workspace Layout Engine
// Persists per-cell layouts in localStorage under rly_layout_[cell]
// ─────────────────────────────────────────────────────────────────────────────

export type WidgetType =
 | 'table' | 'kpi' | 'text' | 'chart' | 'staff' | 'activity'
 | 'heading' | 'divider' | 'callout' | 'toggle' | 'checklist'
 | 'google_sheet' | 'google_links' | 'powerbi' | 'embed'
 | 'announcements' | 'quick_links' | 'approval_queue' | 'staff_requests'
 | 'shared_table' | 'pdf' | 'image' | 'staff_directory'
 // Enterprise new types
 | 'database' | 'ai_assistant' | 'knowledge_base' | 'task_manager'
 | 'financial'
 | 'monthly_report'
 | 'handout'
 | 'sanitation_status';

/** A single data source for an advanced KPI card */
export type KpiAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'unique';

export interface KpiSource {
  id: string;
  tableId: string;           // which table to read from
  field?: string;            // field id to aggregate (undefined → COUNT rows)
  aggregation: KpiAggregation;
  filters?: Record<string, string>; // fieldId → value filter
  label?: string;            // custom label for this source
}

/** How multiple KpiSources are combined into a single display value */
export type KpiCombineMode = 'first' | 'sum' | 'difference' | 'ratio';

export interface LayoutWidget {
 id: string;
 type: WidgetType;
 title: string;
 // type-specific data
 tableId?: string; // for 'table' widgets
 sharedTableId?: string; // for 'shared_table' widgets
 // ── KPI ─────────────────────────────────────────────────────
 kpiLabel?: string;
 kpiValue?: string;           // static/manual override value
 kpiSuffix?: string;
 // ── Advanced KPI (multi-source) ──────────────────────────────
 kpiSources?: KpiSource[];    // if set, compute value from table data
 kpiCombine?: KpiCombineMode; // how sources are merged (default: 'first')
 kpiFormat?: 'number' | 'currency' | 'percent'; // display format
 kpiColor?: 'blue' | 'green' | 'red' | 'amber' | 'violet' | 'slate';
 kpiTarget?: string;          // target value (shows progress bar)
 kpiShowDrillDown?: boolean;  // clicking card opens filtered records
 // ────────────────────────────────────────────────────────────
 content?: string; // text/announcements/embed URL
 links?: { label: string; url: string }[];
 collapsed?: boolean;
 pinned?: boolean;
 fullscreen?: boolean;
 googleSheetUrl?: string;
 // ── Heading ──────────────────────────────────────────────────
 richText?: string;           // editable text for heading/callout/toggle
 headingLevel?: 1 | 2 | 3;   // heading size selector
 // ── Callout ──────────────────────────────────────────────────
 calloutIcon?: string;        // emoji icon
 calloutColor?: string;       // 'amber' | 'blue' | 'emerald' | 'red' | 'violet' | 'slate'
 // ── Checklist ────────────────────────────────────────────────
 checklistItems?: { id: string; text: string; done: boolean }[];
 // ── Toggle ───────────────────────────────────────────────────
 toggleOpen?: boolean;
 // ── Embed / GSheet ───────────────────────────────────────────
 embedUrl?: string;           // raw user-pasted URL
 embedType?: string;          // 'url' | 'gsheet' | 'gdoc' | 'gform' | 'gdrive'
 // ── Table scope ──────────────────────────────────────────────────────────────
 tableScope?: 'all' | 'section' | 'table'; // what this widget displays
 tableSectionId?: string;     // section filter when scope = 'section'
 // ── Monthly Report ───────────────────────────────────────────────────────────
 division?: string;           // railway division, e.g. 'DELHI'
}

export interface LayoutColumn {
 id: string;
 widthPercent: number; // flexible, columns sum to 100
 widgets: LayoutWidget[];
}

export interface LayoutVersion {
 id: string;
 label: string; // e.g."Daily Operations"
 savedAt: string;
 savedBy: string;
 savedByName: string;
 columns: LayoutColumn[];
}

export interface CellLayout {
 cell: string;
 activeLayoutId: string;
 layouts: LayoutVersion[]; // named saved layouts
 columns: LayoutColumn[]; // current working layout
 columnCount: number;
 updatedAt: string;
 updatedBy?: string;
 updatedByName?: string;
}

// ── Default templates ─────────────────────────────────────────────────────────
function gid() { return `w${Date.now()}${Math.floor(Math.random()*9999)}`; }

function makeCol(widthPercent: number, widgets: LayoutWidget[] = []): LayoutColumn {
 return { id: gid(), widthPercent, widgets };
}

function makeWidget(type: WidgetType, title: string, extra: Partial<LayoutWidget> = {}): LayoutWidget {
 return { id: gid(), type, title, collapsed: false, pinned: false, ...extra };
}

export const TEMPLATES: Record<string, { label: string; columns: LayoutColumn[] }> = {
 blank_1: {
 label: '1 Column',
 columns: [makeCol(100)],
 },
 blank_2: {
 label: '2 Columns (50/50)',
 columns: [makeCol(50), makeCol(50)],
 },
 blank_3: {
 label: '3 Columns (33/33/34)',
 columns: [makeCol(33), makeCol(33), makeCol(34)],
 },
 blank_4: {
 label: '4 Columns (25 each)',
 columns: [makeCol(25), makeCol(25), makeCol(25), makeCol(25)],
 },
 blank_5: {
 label: '5 Columns (20 each)',
 columns: [makeCol(20), makeCol(20), makeCol(20), makeCol(20), makeCol(20)],
 },
 wide_side: {
 label: 'Wide + Sidebar (70/30)',
 columns: [makeCol(70), makeCol(30)],
 },
 dashboard: {
 label: 'Dashboard (40/30/30)',
 columns: [makeCol(40), makeCol(30), makeCol(30)],
 },
 manpower: {
 label: 'Manpower Planning Template',
 columns: [
 makeCol(30, [
 makeWidget('staff', 'Staff Summary'),
 makeWidget('kpi', 'Vacancy Positions', { kpiLabel: 'Vacancies', kpiValue: '12' }),
 ]),
 makeCol(40, [
 makeWidget('table', 'DRM Office Staff'),
 makeWidget('shared_table', 'Shared Databases'),
 ]),
 makeCol(30, [
 makeWidget('approval_queue', 'Pending Approvals'),
 makeWidget('staff_requests', 'Transfer Requests'),
 makeWidget('activity', 'Recent Activity'),
 ]),
 ],
 },
 commercial_control: {
 label: 'Commercial Control Template',
 columns: [
 makeCol(20, [makeWidget('kpi', 'UTS Revenue')]),
 makeCol(20, [makeWidget('kpi', 'PRS Bookings')]),
 makeCol(20, [makeWidget('kpi', 'Footfall')]),
 makeCol(20, [makeWidget('kpi', 'Pending Complaints')]),
 makeCol(20, [makeWidget('announcements', 'Notices & Circulars')]),
 ],
 },
 publicity: {
 label: 'Publicity Template',
 columns: [
 makeCol(60, [makeWidget('table', 'Campaign Register')]),
 makeCol(40, [
 makeWidget('kpi', 'Active Campaigns'),
 makeWidget('announcements', 'Announcements'),
 makeWidget('activity', 'Recent Activity'),
 ]),
 ],
 },
};

const DEFAULT_TEMPLATE = 'wide_side';

// ── Storage ───────────────────────────────────────────────────────────────────
function storageKey(cell: string) {
 return `rly_layout_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function deepCloneColumns(cols: LayoutColumn[]): LayoutColumn[] {
 return JSON.parse(JSON.stringify(cols));
}

export function getLayout(cell: string): CellLayout {
 if (typeof window === 'undefined') {
 return makeDefaultLayout(cell);
 }
 try {
 const raw = localStorage.getItem(storageKey(cell));
 if (raw) return JSON.parse(raw) as CellLayout;
 } catch { /* ignore */ }
 return makeDefaultLayout(cell);
}

function makeDefaultLayout(cell: string): CellLayout {
 const tpl = TEMPLATES[DEFAULT_TEMPLATE];
 const now = new Date().toISOString();
 const id = gid();
 return {
 cell,
 activeLayoutId: id,
 layouts: [],
 columns: deepCloneColumns(tpl.columns),
 columnCount: tpl.columns.length,
 updatedAt: now,
 };
}

export function saveLayout(layout: CellLayout) {
 if (typeof window === 'undefined') return;
 localStorage.setItem(storageKey(layout.cell), JSON.stringify({
 ...layout,
 updatedAt: new Date().toISOString(),
 }));
}

// ── Layout mutations ──────────────────────────────────────────────────────────
export function applyTemplate(
 current: CellLayout, templateKey: string,
): CellLayout {
 const tpl = TEMPLATES[templateKey];
 if (!tpl) return current;
 return {
 ...current,
 columns: deepCloneColumns(tpl.columns),
 columnCount: tpl.columns.length,
 };
}

export function setColumns(current: CellLayout, count: number): CellLayout {
 const cols = [...current.columns];
 while (cols.length < count) cols.push(makeCol(0));
 const trimmed = cols.slice(0, count);
 // Redistribute widths evenly
 const total = 100;
 const base = Math.floor(total / count);
 const rem = total - base * count;
 const normalized = trimmed.map((c, i) => ({
 ...c,
 widthPercent: base + (i === trimmed.length - 1 ? rem : 0),
 }));
 return { ...current, columns: normalized, columnCount: count };
}

export function resizeColumn(
 current: CellLayout, colId: string, newPercent: number,
): CellLayout {
 const idx = current.columns.findIndex(c => c.id === colId);
 if (idx < 0) return current;
 // Adjust adjacent column to compensate
 const cols = [...current.columns];
 const oldPct = cols[idx].widthPercent;
 const delta = newPercent - oldPct;
 const adjIdx = idx < cols.length - 1 ? idx + 1 : idx - 1;
 if (adjIdx < 0 || adjIdx >= cols.length) return current;
 const adjNew = Math.max(5, cols[adjIdx].widthPercent - delta);
 const fixedNew = Math.min(90, Math.max(5, newPercent));
 cols[idx] = { ...cols[idx], widthPercent: fixedNew };
 cols[adjIdx] = { ...cols[adjIdx], widthPercent: adjNew };
 return { ...current, columns: cols };
}

export function addWidget(
 current: CellLayout, colId: string, widget: Partial<LayoutWidget>,
): CellLayout {
 const w = makeWidget(widget.type ?? 'text', widget.title ?? 'Widget', widget);
 return {
 ...current,
 columns: current.columns.map(c =>
 c.id !== colId ? c : { ...c, widgets: [...c.widgets, w] }
 ),
 };
}

export function removeWidget(
 current: CellLayout, colId: string, widgetId: string,
): CellLayout {
 return {
 ...current,
 columns: current.columns.map(c =>
 c.id !== colId ? c : { ...c, widgets: c.widgets.filter(w => w.id !== widgetId) }
 ),
 };
}

export function updateWidget(
 current: CellLayout, colId: string, widgetId: string, patch: Partial<LayoutWidget>,
): CellLayout {
 return {
 ...current,
 columns: current.columns.map(c =>
 c.id !== colId ? c : {
 ...c,
 widgets: c.widgets.map(w => w.id !== widgetId ? w : { ...w, ...patch }),
 }
 ),
 };
}

export function moveWidget(
 current: CellLayout,
 fromColId: string, fromIdx: number,
 toColId: string, toIdx: number,
): CellLayout {
 let widget: LayoutWidget | null = null;
 let cols = current.columns.map(c => {
 if (c.id !== fromColId) return c;
 const widgets = [...c.widgets];
 [widget] = widgets.splice(fromIdx, 1);
 return { ...c, widgets };
 });
 if (!widget) return current;
 const w = widget;
 cols = cols.map(c => {
 if (c.id !== toColId) return c;
 const widgets = [...c.widgets];
 widgets.splice(toIdx, 0, w);
 return { ...c, widgets };
 });
 return { ...current, columns: cols };
}

export function toggleWidgetProp(
 current: CellLayout, colId: string, widgetId: string,
 prop: 'collapsed' | 'pinned' | 'fullscreen',
): CellLayout {
 return {
 ...current,
 columns: current.columns.map(c =>
 c.id !== colId ? c : {
 ...c,
 widgets: c.widgets.map(w =>
 w.id !== widgetId ? w : { ...w, [prop]: !w[prop] }
 ),
 }
 ),
 };
}

// ── Named layouts (saved snapshots) ──────────────────────────────────────────
export function saveNamedLayout(
 current: CellLayout, label: string, userId: string, userName: string,
): CellLayout {
 const version: LayoutVersion = {
 id: gid(),
 label,
 savedAt: new Date().toISOString(),
 savedBy: userId,
 savedByName: userName,
 columns: deepCloneColumns(current.columns),
 };
 return { ...current, layouts: [version, ...current.layouts].slice(0, 20) };
}

export function loadNamedLayout(
 current: CellLayout, versionId: string,
): CellLayout {
 const v = current.layouts.find(l => l.id === versionId);
 if (!v) return current;
 return { ...current, columns: deepCloneColumns(v.columns), columnCount: v.columns.length };
}

export const AVAILABLE_WIDGETS: { type: WidgetType; label: string; description: string; icon: string; group: string }[] = [
  { type: 'table',          label: 'Table / Database', description: 'Embed a database with views, filters, sorting', icon: 'Table2',         group: 'Database' },
  { type: 'shared_table',   label: 'Linked Database',  description: 'Reference a shared database from another cell', icon: 'Share2',         group: 'Database' },
  { type: 'google_sheet',   label: 'Google Sheet',     description: 'Live-synced Google Sheet data',              icon: 'FileSpreadsheet',  group: 'Database' },
  { type: 'text',           label: 'Text / Notes',     description: 'Rich text notes and documentation',            icon: 'FileText',        group: 'Content' },
  { type: 'heading',        label: 'Heading',          description: 'H1, H2 or H3 heading',                        icon: 'Heading',         group: 'Content' },
  { type: 'callout',        label: 'Callout',          description: 'Highlighted note or alert box',               icon: 'AlertCircle',     group: 'Content' },
  { type: 'divider',        label: 'Divider',          description: 'Horizontal separator line',                   icon: 'Minus',           group: 'Content' },
  { type: 'toggle',         label: 'Toggle',           description: 'Collapsible expandable section',              icon: 'ChevronRight',    group: 'Content' },
  { type: 'checklist',      label: 'Checklist',        description: 'Action items and compliance checks',          icon: 'CheckSquare',     group: 'Content' },
  { type: 'announcements',  label: 'Announcements',    description: 'Notices, circulars and updates',              icon: 'Bell',            group: 'Content' },
  { type: 'kpi',            label: 'KPI Card',         description: 'Key metric with label and value',             icon: 'BarChart3',       group: 'Data' },
  { type: 'chart',          label: 'Chart',            description: 'Bar, line or pie chart',                      icon: 'TrendingUp',      group: 'Data' },
  { type: 'activity',       label: 'Activity Feed',    description: 'Recent workspace changes and actions',        icon: 'Activity',        group: 'Data' },
  { type: 'staff',          label: 'Staff Cards',      description: 'Cell staff roster as cards',                  icon: 'Users2',          group: 'People' },
  { type: 'approval_queue', label: 'Approval Queue',   description: 'Pending staff approvals for this cell',      icon: 'UserCheck',       group: 'People' },
  { type: 'staff_requests', label: 'Staff Requests',   description: 'Transfer and assignment requests',             icon: 'ClipboardList',   group: 'People' },
  { type: 'google_links',   label: 'Links Repository', description: 'Google Docs, Drive, Forms and portal links', icon: 'Link2',           group: 'Embed' },
  { type: 'powerbi',        label: 'Power BI',         description: 'Embedded Power BI report',                   icon: 'PieChart',        group: 'Embed' },
  { type: 'embed',          label: 'Embed / iFrame',   description: 'Embed any URL as an iframe',                 icon: 'Globe',           group: 'Embed' },
  { type: 'quick_links',    label: 'Quick Links',      description: 'Configurable shortcut links',                 icon: 'ExternalLink',    group: 'Embed' },
  // Enterprise blocks
  { type: 'database',       label: 'Database',         description: 'Full database with Table, Board, Calendar, Gallery, Chart views', icon: 'Database',      group: 'Enterprise' },
  { type: 'sanitation_status', label: 'Sanitation Live Status', description: 'Live tracking of station cleanliness checkpoints', icon: 'Sparkles', group: 'Data' },
  { type: 'ai_assistant',   label: 'AI Assistant',     description: 'AI chat that searches your workspace data',   icon: 'Bot',             group: 'Enterprise' },
  { type: 'knowledge_base', label: 'Knowledge Base',   description: 'Policies, circulars, SOPs and documents',     icon: 'BookOpen',        group: 'Enterprise' },
  { type: 'task_manager',   label: 'Task Manager',     description: 'Kanban task management with assignments',      icon: 'CheckSquare',     group: 'Enterprise' },
];

// ── Row-based layout extension (req 76–78) ────────────────────────────────────
// A workspace can be divided into rows, each with its own column layout.
// This enables the full nested layout model: rows of columns, each cell
// containing widgets.

export interface LayoutRow {
  id: string;
  label?: string;           // e.g. "KPI Row", "Tables Row"
  heightMode: 'auto' | 'fixed';
  fixedHeight?: number;     // px, used when heightMode === 'fixed'
  columns: LayoutColumn[];  // reuse existing LayoutColumn/Widget types
  collapsed: boolean;
}

export interface RowBasedLayout {
  cell: string;
  rows: LayoutRow[];
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
  versions: Array<{
    id: string; label: string; savedAt: string;
    savedBy: string; savedByName: string;
    rows: LayoutRow[];
  }>;
}

const ROW_KEY = (cell: string) =>
  `rly_rowlayout_${cell.replace(/[^a-zA-Z0-9]/g, '_')}`;

function gidR() { return `r${Date.now()}${Math.floor(Math.random() * 9999)}`; }

function defaultRow(widths: number[] = [100]): LayoutRow {
  return {
    id: gidR(),
    heightMode: 'auto',
    collapsed: false,
    columns: widths.map(w => ({ id: gidR(), widthPercent: w, widgets: [] })),
  };
}

export function getRowLayout(cell: string): RowBasedLayout {
  if (typeof window === 'undefined') return makeDefaultRowLayout(cell);
  try {
    const raw = localStorage.getItem(ROW_KEY(cell));
    if (raw) return JSON.parse(raw) as RowBasedLayout;
  } catch { /* ignore */ }
  return makeDefaultRowLayout(cell);
}

function makeDefaultRowLayout(cell: string): RowBasedLayout {
  return {
    cell, updatedAt: new Date().toISOString(), versions: [],
    rows: [
      { ...defaultRow([100]), label: 'KPI Overview' },
      { ...defaultRow([65, 35]), label: 'Main Content' },
      { ...defaultRow([33, 33, 34]), label: 'Additional' },
    ],
  };
}

export function saveRowLayout(layout: RowBasedLayout): void {
  if (typeof window === 'undefined') return;
  const nextRow = { ...layout, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    const key = ROW_KEY(layout.cell);
    localStorage.setItem(key, JSON.stringify(nextRow));
    sharedWrite(key, nextRow);
  }
}

// Row mutations
export function addRow(layout: RowBasedLayout, afterRowId?: string): RowBasedLayout {
  const newRow = defaultRow([100]);
  if (!afterRowId) return { ...layout, rows: [...layout.rows, newRow] };
  const idx = layout.rows.findIndex(r => r.id === afterRowId);
  const rows = [...layout.rows];
  rows.splice(idx + 1, 0, newRow);
  return { ...layout, rows };
}

export function removeRow(layout: RowBasedLayout, rowId: string): RowBasedLayout {
  return { ...layout, rows: layout.rows.filter(r => r.id !== rowId) };
}

export function moveRow(layout: RowBasedLayout, rowId: string, dir: 'up' | 'down'): RowBasedLayout {
  const rows = [...layout.rows];
  const idx = rows.findIndex(r => r.id === rowId);
  if (idx < 0) return layout;
  const newIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= rows.length) return layout;
  [rows[idx], rows[newIdx]] = [rows[newIdx], rows[idx]];
  return { ...layout, rows };
}

export function updateRow(layout: RowBasedLayout, rowId: string, patch: Partial<LayoutRow>): RowBasedLayout {
  return { ...layout, rows: layout.rows.map(r => r.id !== rowId ? r : { ...r, ...patch }) };
}

export function setRowColumns(layout: RowBasedLayout, rowId: string, widths: number[]): RowBasedLayout {
  return {
    ...layout,
    rows: layout.rows.map(r => {
      if (r.id !== rowId) return r;
      // Redistribute while preserving existing widgets where possible
      const newCols = widths.map((w, i) => ({
        id: r.columns[i]?.id ?? gidR(),
        widthPercent: w,
        widgets: r.columns[i]?.widgets ?? [],
      }));
      return { ...r, columns: newCols };
    }),
  };
}

export function addWidgetToRow(
  layout: RowBasedLayout, rowId: string, colId: string, widget: Partial<LayoutWidget>
): RowBasedLayout {
  const w = { id: gidR(), type: widget.type ?? 'text', title: widget.title ?? 'Widget',
    collapsed: false, pinned: false, ...widget };
  return {
    ...layout,
    rows: layout.rows.map(r => r.id !== rowId ? r : {
      ...r,
      columns: r.columns.map(c => c.id !== colId ? c : {
        ...c, widgets: [...c.widgets, w],
      }),
    }),
  };
}

export function removeWidgetFromRow(
  layout: RowBasedLayout, rowId: string, colId: string, widgetId: string
): RowBasedLayout {
  return {
    ...layout,
    rows: layout.rows.map(r => r.id !== rowId ? r : {
      ...r,
      columns: r.columns.map(c => c.id !== colId ? c : {
        ...c, widgets: c.widgets.filter(w => w.id !== widgetId),
      }),
    }),
  };
}

export function updateWidgetInRow(
  layout: RowBasedLayout, rowId: string, colId: string, widgetId: string, patch: Partial<LayoutWidget>
): RowBasedLayout {
  return {
    ...layout,
    rows: layout.rows.map(r => r.id !== rowId ? r : {
      ...r,
      columns: r.columns.map(c => c.id !== colId ? c : {
        ...c, widgets: c.widgets.map(w => w.id !== widgetId ? w : { ...w, ...patch }),
      }),
    }),
  };
}

export function moveWidgetInRow(
  layout: RowBasedLayout,
  fromRowId: string, fromColId: string, fromIdx: number,
  toRowId: string, toColId: string, toIdx: number
): RowBasedLayout {
  // Extract the widget
  let widget: LayoutWidget | null = null;
  let rows = layout.rows.map(r => {
    if (r.id !== fromRowId) return r;
    return {
      ...r, columns: r.columns.map(c => {
        if (c.id !== fromColId) return c;
        const ws = [...c.widgets];
        [widget] = ws.splice(fromIdx, 1);
        return { ...c, widgets: ws };
      }),
    };
  });
  if (!widget) return layout;
  const w = widget;
  rows = rows.map(r => {
    if (r.id !== toRowId) return r;
    return {
      ...r, columns: r.columns.map(c => {
        if (c.id !== toColId) return c;
        const ws = [...c.widgets];
        ws.splice(toIdx, 0, w);
        return { ...c, widgets: ws };
      }),
    };
  });
  return { ...layout, rows };
}

export function resizeRowColumn(
  layout: RowBasedLayout, rowId: string, colId: string, newPct: number
): RowBasedLayout {
  return {
    ...layout,
    rows: layout.rows.map(r => {
      if (r.id !== rowId) return r;
      const idx = r.columns.findIndex(c => c.id === colId);
      if (idx < 0 || idx >= r.columns.length - 1) return r;
      const cols = [...r.columns];
      const adjIdx = idx + 1;
      const total = cols[idx].widthPercent + cols[adjIdx].widthPercent;
      const fixed = Math.max(5, Math.min(total - 5, newPct));
      cols[idx] = { ...cols[idx], widthPercent: fixed };
      cols[adjIdx] = { ...cols[adjIdx], widthPercent: total - fixed };
      return { ...r, columns: cols };
    }),
  };
}

export function saveRowLayoutVersion(
  layout: RowBasedLayout, label: string, userId: string, userName: string
): RowBasedLayout {
  const version = {
    id: gidR(), label, savedAt: new Date().toISOString(),
    savedBy: userId, savedByName: userName,
    rows: JSON.parse(JSON.stringify(layout.rows)),
  };
  return { ...layout, versions: [version, ...layout.versions].slice(0, 20) };
}

export function loadRowLayoutVersion(layout: RowBasedLayout, versionId: string): RowBasedLayout {
  const v = layout.versions.find(v => v.id === versionId);
  if (!v) return layout;
  return { ...layout, rows: JSON.parse(JSON.stringify(v.rows)) };
}

export const ROW_COLUMN_PRESETS: { label: string; widths: number[] }[] = [
  { label: '1 Column',      widths: [100] },
  { label: '2 Equal',       widths: [50, 50] },
  { label: '3 Equal',       widths: [33, 33, 34] },
  { label: '4 Equal',       widths: [25, 25, 25, 25] },
  { label: '5 Equal',       widths: [20, 20, 20, 20, 20] },
  { label: '60 / 40',       widths: [60, 40] },
  { label: '70 / 30',       widths: [70, 30] },
  { label: '40 / 30 / 30',  widths: [40, 30, 30] },
  { label: '60 / 20 / 20',  widths: [60, 20, 20] },
  { label: '50 / 25 / 25',  widths: [50, 25, 25] },
];
