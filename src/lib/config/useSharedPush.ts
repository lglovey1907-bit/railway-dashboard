'use client';
/**
 * useSharedPush — runs once per admin/maintenance session.
 *
 * The _shared_ namespace is the canonical source-of-truth for all
 * admin-authored content. sharedWrite() is called on every future
 * mutation, but existing data (saved before this system existed) is
 * still only in the admin's per-user namespace / localStorage.
 *
 * This hook backfills _shared_ from localStorage every time an admin
 * or maintenance user loads the dashboard, so that granted users
 * always see up-to-date content without any manual "publish" step.
 */
import { useEffect, useRef } from 'react';
import { sharedWrite } from './sharedSync';
import { getAllCells } from '@/lib/cells/cellRegistry';

const POLICY_SUB_IDS = [
  'commercial-circulars','railway-board','divisional','sops',
  'policies','manuals','instructions','office-orders','acts-rules',
];

function push(lsKey: string, nsKey: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(lsKey);
  if (!raw) return;
  try { sharedWrite(nsKey, JSON.parse(raw)); }
  catch { sharedWrite(nsKey, raw as unknown); }
}

export function useSharedPush(role: string | undefined) {
  const ran = useRef(false);

  useEffect(() => {
    if (!role || (role !== 'admin' && role !== 'maintenance')) return;
    if (ran.current) return;
    ran.current = true;
    if (typeof window === 'undefined') return;

    // ── Power BI embed URLs ─────────────────────────────────────────────────
    ['powerbi_revenue_prs','powerbi_revenue_uts',
     'powerbi_revenue_footfall','powerbi_revenue_tc']
      .forEach(pk => push(pk, pk));

    // ── Google Sheet URLs + field configs ───────────────────────────────────
    ['sheet_nsg_category_wise','sheet_policies_circulars_sop'].forEach(sk => {
      push(sk, sk);
      push(`${sk}_fields_v2`, `${sk}_fields_v2`);
    });

    // ── Overview DB view stores ─────────────────────────────────────────────
    push('rly_dbviews_overview',                      'dbviews_overview');
    push('rly_dbviews_sheet_nsg_category_wise',       'dbviews_sheet_nsg_category_wise');
    push('rly_dbviews_sheet_policies_circulars_sop',  'dbviews_sheet_policies_circulars_sop');

    // ── Financial data ──────────────────────────────────────────────────────
    push('rly_financial_v1',    'financial_v1');
    push('rly_fin_unit',        'fin_unit');
    push('rly_fin_vis_cols',    'fin_vis_cols');
    push('rly_fin_col_labels',  'fin_col_labels');

    // ── Tab access configs ──────────────────────────────────────────────────
    ['overview','revenue','policies'].forEach(tabId => {
      push(`rly_tab_access_${tabId}`, `tab_access_${tabId}`);
    });

    // ── Custom tabs list + per-tab workspace + per-tab access ───────────────
    push('rly_dashboard_custom_tabs', 'dashboard_custom_tabs');
    try {
      const tabs: Array<{ id: string }> = JSON.parse(
        localStorage.getItem('rly_dashboard_custom_tabs') ?? '[]'
      );
      tabs.forEach(tab => {
        const safe = tab.id.replace(/[^a-zA-Z0-9]/g, '_');
        push(`workspace_v2_dashboard_tab_${safe}`, `ws_dashboard_tab_${safe}`);
        push(`rly_tab_access_${tab.id}`,            `tab_access_${tab.id}`);
      });
    } catch { /* ignore */ }

    // ── Policy workspace content ────────────────────────────────────────────
    POLICY_SUB_IDS.forEach(id => {
      const safe = id.replace(/[^a-zA-Z0-9]/g, '_');
      push(`rly_policy_ws_${id}`, `policy_ws_${safe}`);
    });

    // ── Cell workspace content (Marketing, Revenue, etc.) ──────────────────
    // Each cell's workspace builder layout must be visible to all users
    try {
      const cells = getAllCells();
      cells.forEach(cell => {
        const cn = cell.name;
        const lsSafe = cn.replace(/\W/g, '_');
        const nsSafe = cn.replace(/\W/g, '_');
        // Main workspace canvas
        push(`workspace_v2_${lsSafe}`, `cell_ws_${nsSafe}`);
        // Row layout
        push(`rly_rowlayout_${lsSafe}`, `cell_rowlayout_${nsSafe}`);
        // Page/link registry
        const linkSafe = cn.replace(/[^a-zA-Z0-9]/g, '_');
        push(`rly_links_${linkSafe}`, `links_${linkSafe}`);
        // Sidebar hidden state
        push(`rly_sidebar_hidden_${lsSafe}`, `sidebar_hidden_${nsSafe}`);
      });
    } catch { /* ignore */ }

    // ── Cell registry (which cells are active/created) ──────────────────────
    push('rly_cell_registry', 'cell_registry');

  }, [role]);
}
