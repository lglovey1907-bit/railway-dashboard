/**
 * Policy Workspace Engine
 * All data persisted in: localStorage (instant) + Upstash (cross-device)
 */
import { syncedWrite, syncedRead, cloudWrite, cloudRead } from '@/lib/config/cloudSync';
import { sharedWrite } from '@/lib/config/sharedSync';

export const POLICY_SUBHEADS = [
  { id: 'commercial-circulars',  label: 'Commercial Circulars',  icon: 'FileText' },
  { id: 'railway-board',         label: 'Railway Board Circulars', icon: 'Building2' },
  { id: 'divisional',            label: 'Divisional Circulars',  icon: 'Layers' },
  { id: 'sops',                  label: 'SOPs',                  icon: 'ClipboardList' },
  { id: 'policies',              label: 'Policies',              icon: 'Shield' },
  { id: 'manuals',               label: 'Manuals',               icon: 'BookOpen' },
  { id: 'instructions',          label: 'Instructions',          icon: 'Info' },
  { id: 'office-orders',         label: 'Office Orders',         icon: 'Stamp' },
  { id: 'acts-rules',            label: 'Acts & Rules',          icon: 'Scale' },
] as const;

export type SubHeadId = typeof POLICY_SUBHEADS[number]['id'];

export interface PolicyLink {
  id: string; title: string; url: string;
  description?: string; category: string;
  addedBy: string; addedAt: string;
}

export interface PolicyLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  addedBy: string;
  addedAt: string;
}

export interface PolicySection {
  id: string;
  title: string;
  collapsed: boolean;
  order: number;
  rows: Array<{
    id: string;
    label?: string;
    columns: Array<{
      id: string;
      widthPercent: number;
      widgets: Array<{
        id: string;
        type: 'table'|'richtext'|'links'|'notes'|'powerbi'|'googlesheet'|'checklist'|'kpi';
        title: string;
        collapsed: boolean;
        tableId?: string;
        richText?: string;
        notes?: string;
        powerBiUrl?: string;
        sheetUrl?: string;
        checklistItems?: Array<{ id: string; text: string; done: boolean }>;
        // Links stored directly in widget — ensures complete data isolation per widget
        links?: PolicyLink[];
      }>;
    }>;
  }>;
}

export interface PolicySubHeadWorkspace {
  subHeadId: string;
  sections: PolicySection[];
  updatedAt: string;
  updatedBy?: string;
}

function lsKey(subHeadId: string) { return `rly_policy_ws_${subHeadId}`; }
function ckKey(subHeadId: string) { return `policy_ws_${subHeadId.replace(/[^a-zA-Z0-9]/g, '_')}`; }
function gid() { return `p${Date.now()}${Math.floor(Math.random() * 9999)}`; }

function makeSection(title: string, order: number): PolicySection {
  return {
    id: gid(), title, collapsed: false, order,
    rows: [{ id: gid(), columns: [{ id: gid(), widthPercent: 100, widgets: [] }] }],
  };
}

function defaultSections(subHeadId: string): PolicySection[] {
  switch (subHeadId) {
    case 'commercial-circulars':
      return ['General Circulars', 'Ticket Checking Circulars', 'UTS Circulars', 'PRS Circulars'].map(makeSection);
    case 'sops':
      return ['Station Operations', 'Ticket Checking Procedures', 'Revenue Reporting', 'Emergency Procedures'].map(makeSection);
    case 'railway-board':
      return ['Fare Circulars', 'Staff Circulars', 'Operational Circulars'].map(makeSection);
    case 'policies':
      return ['Passenger Policies', 'Revenue Policies', 'Staff Policies'].map(makeSection);
    case 'manuals':
      return ['Commercial Manual', 'Station Master Manual', 'Accounts Manual'].map(makeSection);
    default:
      return [makeSection('General', 0)];
  }
}

// ── Read — localStorage instantly, Upstash in background ─────────────────────
export function getPolicyWorkspace(subHeadId: string): PolicySubHeadWorkspace {
  if (typeof window === 'undefined') {
    return { subHeadId, sections: defaultSections(subHeadId), updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(lsKey(subHeadId));
    if (raw) return JSON.parse(raw) as PolicySubHeadWorkspace;
  } catch { /* ignore */ }
  return { subHeadId, sections: defaultSections(subHeadId), updatedAt: new Date().toISOString() };
}

/**
 * Load from Upstash. Returns null if not found or KV not configured.
 * Caller should update state when promise resolves.
 */
export async function loadPolicyWorkspaceFromCloud(
  subHeadId: string, userId: string
): Promise<PolicySubHeadWorkspace | null> {
  if (!userId) return null;
  // Try new sanitized key first
  let result = await cloudRead(userId, ckKey(subHeadId));
  // Fallback: try old hyphenated key (data saved before the key fix)
  if (!result.value) {
    result = await cloudRead(userId, `policy_ws_${subHeadId}`);
    if (result.value) {
      // Migrate: re-save under the correct key
      cloudWrite(userId, ckKey(subHeadId), result.value).catch(() => {});
    }
  }
  if (!result.value) return null;
  const ws = result.value as PolicySubHeadWorkspace;
  if (typeof window !== 'undefined') {
    localStorage.setItem(lsKey(subHeadId), JSON.stringify(ws));
  }
  return ws;
}

// ── Write — localStorage + Upstash ───────────────────────────────────────────
export function savePolicyWorkspace(ws: PolicySubHeadWorkspace, userId?: string): void {
  const next = { ...ws, updatedAt: new Date().toISOString(), updatedBy: userId };
  if (typeof window !== 'undefined') {
    localStorage.setItem(lsKey(ws.subHeadId), JSON.stringify(next));
  }
  // Sync to Upstash in background (non-blocking)
  if (userId) {
    cloudWrite(userId, ckKey(ws.subHeadId), next).catch(e =>
      console.warn('[policyWorkspace] cloud write failed:', e)
    );
  }
  // Also write to shared namespace so all users get latest policy content
  sharedWrite(ckKey(ws.subHeadId), next);
}

// ── Section mutations ─────────────────────────────────────────────────────────
export function addSection(ws: PolicySubHeadWorkspace, title: string): PolicySubHeadWorkspace {
  return { ...ws, sections: [...ws.sections, makeSection(title, ws.sections.length)] };
}
export function updateSection(ws: PolicySubHeadWorkspace, id: string, patch: Partial<PolicySection>): PolicySubHeadWorkspace {
  return { ...ws, sections: ws.sections.map(s => s.id !== id ? s : { ...s, ...patch }) };
}
export function removeSection(ws: PolicySubHeadWorkspace, id: string): PolicySubHeadWorkspace {
  return { ...ws, sections: ws.sections.filter(s => s.id !== id) };
}
export function moveSection(ws: PolicySubHeadWorkspace, id: string, dir: 'up'|'down'): PolicySubHeadWorkspace {
  const ss = [...ws.sections].sort((a, b) => a.order - b.order);
  const idx = ss.findIndex(s => s.id === id);
  const ni = dir === 'up' ? idx - 1 : idx + 1;
  if (ni < 0 || ni >= ss.length) return ws;
  [ss[idx], ss[ni]] = [ss[ni], ss[idx]];
  return { ...ws, sections: ss.map((s, i) => ({ ...s, order: i })) };
}

// ── Layout ────────────────────────────────────────────────────────────────────
export const COLUMN_PRESETS = [
  { label: '1 Column',     widths: [100] },
  { label: '2 Equal',      widths: [50, 50] },
  { label: '3 Equal',      widths: [33, 33, 34] },
  { label: '4 Equal',      widths: [25, 25, 25, 25] },
  { label: '30 / 70',      widths: [30, 70] },
  { label: '70 / 30',      widths: [70, 30] },
  { label: '40 / 30 / 30', widths: [40, 30, 30] },
  { label: '60 / 20 / 20', widths: [60, 20, 20] },
];

export function setSectionLayout(ws: PolicySubHeadWorkspace, sectionId: string, widths: number[]): PolicySubHeadWorkspace {
  return updateSection(ws, sectionId, {
    rows: [{
      id: gid(),
      columns: widths.map((w, i) => ({
        id: ws.sections.find(s => s.id === sectionId)?.rows[0]?.columns[i]?.id ?? gid(),
        widthPercent: w,
        widgets: ws.sections.find(s => s.id === sectionId)?.rows[0]?.columns[i]?.widgets ?? [],
      })),
    }],
  });
}

export function addRowToSection(ws: PolicySubHeadWorkspace, sectionId: string): PolicySubHeadWorkspace {
  const sec = ws.sections.find(s => s.id === sectionId);
  if (!sec) return ws;
  return updateSection(ws, sectionId, {
    rows: [...sec.rows, { id: gid(), columns: [{ id: gid(), widthPercent: 100, widgets: [] }] }],
  });
}

// ── Widget mutations ──────────────────────────────────────────────────────────
type WType = PolicySection['rows'][0]['columns'][0]['widgets'][0]['type'];
type Widget = PolicySection['rows'][0]['columns'][0]['widgets'][0];

export function addWidget(ws: PolicySubHeadWorkspace, sectionId: string, rowId: string, colId: string, type: WType, title: string): PolicySubHeadWorkspace {
  const w: Widget = { id: gid(), type, title, collapsed: false };
  return updateSection(ws, sectionId, {
    rows: ws.sections.find(s => s.id === sectionId)?.rows.map(r =>
      r.id !== rowId ? r : { ...r, columns: r.columns.map(c => c.id !== colId ? c : { ...c, widgets: [...c.widgets, w] }) }
    ) ?? [],
  });
}

export function updateWidget(ws: PolicySubHeadWorkspace, sectionId: string, rowId: string, colId: string, widgetId: string, patch: Partial<Widget>): PolicySubHeadWorkspace {
  return updateSection(ws, sectionId, {
    rows: ws.sections.find(s => s.id === sectionId)?.rows.map(r =>
      r.id !== rowId ? r : { ...r, columns: r.columns.map(c => c.id !== colId ? c : { ...c, widgets: c.widgets.map(w => w.id !== widgetId ? w : { ...w, ...patch }) }) }
    ) ?? [],
  });
}

export function removeWidget(ws: PolicySubHeadWorkspace, sectionId: string, rowId: string, colId: string, widgetId: string): PolicySubHeadWorkspace {
  return updateSection(ws, sectionId, {
    rows: ws.sections.find(s => s.id === sectionId)?.rows.map(r =>
      r.id !== rowId ? r : { ...r, columns: r.columns.map(c => c.id !== colId ? c : { ...c, widgets: c.widgets.filter(w => w.id !== widgetId) }) }
    ) ?? [],
  });
}

export const WIDGET_TYPES = [
  { type: 'richtext',    label: 'Rich Text',        description: 'Notes, procedures, instructions' },
  { type: 'links',       label: 'Links Repository', description: 'Google Docs, Sheets, Drive links' },
  { type: 'notes',       label: 'Quick Notes',      description: 'Plain text notepad' },
  { type: 'checklist',   label: 'Checklist',        description: 'Action items and compliance checks' },
  { type: 'powerbi',     label: 'Power BI',         description: 'Embedded Power BI report' },
  { type: 'googlesheet', label: 'Google Sheet',     description: 'Live Google Sheet data' },
  { type: 'table',       label: 'Table',            description: 'Circular register or compliance tracker' },
  { type: 'kpi',         label: 'KPI Card',         description: 'Key metric display' },
] as const;
