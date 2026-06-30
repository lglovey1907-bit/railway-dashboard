'use client';
/**
 * useAppSync — runs once on login, bulk-loads ALL workspace data from Upstash.
 *
 * This is the single entry point that makes everything cross-device.
 * It runs in the dashboard layout after the user is authenticated,
 * fetches all namespaces in parallel, and populates localStorage.
 * All components then read from localStorage as normal — they get
 * the cloud-synced values without any component-level changes needed.
 *
 * On save, components still write to localStorage synchronously.
 * syncedSave() fires a background Upstash write on every mutation.
 */
import { useEffect, useRef, useState } from 'react';
import { NS } from './SyncManager';
import { POLICY_SUBHEADS } from '@/lib/policies/policyWorkspace';
import { getAllCells } from '@/lib/cells/cellRegistry';

const API = '/api/config';
const SHARED_UID = '_shared_';

async function fetchAll(userId: string, namespaces: string[]): Promise<Record<string, string | null>> {
  // Batch all reads in parallel
  const results = await Promise.all(
    namespaces.map(ns =>
      fetch(`${API}?userId=${encodeURIComponent(userId)}&namespace=${encodeURIComponent(ns)}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { value: null })
        .then(d => ({ ns, value: d.value as string | null }))
        .catch(() => ({ ns, value: null }))
    )
  );
  const map: Record<string, string | null> = {};
  results.forEach(({ ns, value }) => { map[ns] = value; });
  return map;
}

function applyToLocalStorage(map: Record<string, Record<string, string | null>>): void {
  if (typeof window === 'undefined') return;
  Object.entries(map).forEach(([lsKey, nsMap]) => {
    Object.entries(nsMap).forEach(([, cloudValue]) => {
      if (!cloudValue) return;
      // Check if cloud is newer than local
      const localRaw = localStorage.getItem(lsKey);
      if (localRaw) {
        try {
          const local = JSON.parse(localRaw);
          const cloud = JSON.parse(cloudValue);
          const localTime = (local as any).updatedAt ?? '';
          const cloudTime = (cloud as any).updatedAt ?? '';
          if (cloudTime <= localTime) return; // local is newer, keep it
        } catch { /* apply anyway */ }
      }
      localStorage.setItem(lsKey, cloudValue);
    });
  });
}

interface SyncStatus {
  loading: boolean;
  done: boolean;
  kvAvailable: boolean;
  namespacesSynced: number;
}

export function useAppSync(userId: string | undefined): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    loading: false, done: false, kvAvailable: false, namespacesSynced: 0,
  });
  const ranFor = useRef<string>('');

  useEffect(() => {
    if (!userId || ranFor.current === userId) return;
    ranFor.current = userId;
    setStatus(s => ({ ...s, loading: true }));

    // Build the list of ALL namespaces to fetch
    const buildNamespaces = (): Array<{ lsKey: string; nsKey: string }> => {
      const entries: Array<{ lsKey: string; nsKey: string }> = [];

      // Policy workspaces — one per sub-head (try BOTH old hyphenated and new underscore keys)
      POLICY_SUBHEADS.forEach(sub => {
        // New sanitized key (current format)
        entries.push({
          lsKey: `rly_policy_ws_${sub.id}`,
          nsKey: NS.policyWorkspace(sub.id),   // policy_ws_commercial_circulars
        });
        // Old hyphenated key (migration fallback — for data saved before the fix)
        const oldKey = `policy_ws_${sub.id}`;  // policy_ws_commercial-circulars
        if (oldKey !== NS.policyWorkspace(sub.id)) {
          entries.push({
            lsKey: `rly_policy_ws_${sub.id}`,
            nsKey: oldKey,
          });
        }
      });

      // Cell workspaces, layouts, links — for all known cells
      const cells = typeof window !== 'undefined' ? (() => {
        try { return getAllCells(); } catch { return []; }
      })() : [];

      cells.forEach(cell => {
        const cn = cell.name;
        entries.push(
          { lsKey: `workspace_v2_${cn.replace(/\W/g, '_')}`,     nsKey: NS.cellWorkspace(cn) },
          { lsKey: `rly_rowlayout_${cn.replace(/\W/g, '_')}`,    nsKey: NS.cellRowLayout(cn) },
          { lsKey: `rly_links_${cn.replace(/[^a-zA-Z0-9]/g, '_')}`,  nsKey: NS.cellLinks(cn) },
        );
      });

      // View store
      entries.push({
        lsKey: 'rly_views_sheet_nsg_category_wise',
        nsKey: NS.viewStore('sheet_nsg_category_wise'),
      });

      // Google Sheet URLs + fields — nsKey = storageKey (matches useCloudConfig namespace)
      ['sheet_nsg_category_wise', 'sheet_policies_circulars_sop'].forEach(sk => {
        entries.push(
          { lsKey: sk,                    nsKey: sk },
          { lsKey: `${sk}_fields_v2`,     nsKey: `${sk}_fields_v2` },
        );
      });

      // Power BI configs — nsKey = storageKey (matches useCloudConfig namespace)
      ['powerbi_revenue_prs', 'powerbi_revenue_uts', 'powerbi_revenue_footfall', 'powerbi_revenue_tc'].forEach(pk => {
        entries.push({ lsKey: pk, nsKey: pk });
      });

      // Dashboard custom tabs
      entries.push({
        lsKey: 'rly_dashboard_custom_tabs',
        nsKey: NS.customTabs(),
      });

      // Cell registry
      entries.push({
        lsKey: 'rly_cell_registry',
        nsKey: NS.cellRegistry(),
      });

      // Staff data
      entries.push(
        { lsKey: 'rly_staff_master',           nsKey: NS.staffMaster() },
        { lsKey: 'rly_cell_memberships',        nsKey: NS.staffMembers() },
        { lsKey: 'rly_user_status_overrides',   nsKey: NS.staffStatus() },
        { lsKey: 'rly_collab_registry',         nsKey: NS.cellCollab() },
        { lsKey: 'rly_user_requests',           nsKey: NS.staffRequests() },
      );

      // ── Shared global content (same data for all users) ──────────────────
      // Financial data
      entries.push({ lsKey: 'rly_financial_v1',     nsKey: 'financial_v1' });
      // Financial UI prefs
      entries.push({ lsKey: 'rly_fin_unit',          nsKey: 'fin_unit' });
      entries.push({ lsKey: 'rly_fin_vis_cols',      nsKey: 'fin_vis_cols' });
      entries.push({ lsKey: 'rly_fin_col_labels',    nsKey: 'fin_col_labels' });
      // Tab access configs
      ['overview', 'revenue', 'policies'].forEach(tabId => {
        entries.push({ lsKey: `rly_tab_access_${tabId}`, nsKey: `tab_access_${tabId}` });
      });
      // Custom tab workspaces + access (loaded by tab IDs from rly_dashboard_custom_tabs)
      if (typeof window !== 'undefined') {
        try {
          const tabs: Array<{id: string}> = JSON.parse(localStorage.getItem('rly_dashboard_custom_tabs') ?? '[]');
          tabs.forEach(tab => {
            entries.push({
              lsKey: `workspace_v2_dashboard_tab_${tab.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
              nsKey: `ws_dashboard_tab_${tab.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
            });
            entries.push({ lsKey: `rly_tab_access_${tab.id}`, nsKey: `tab_access_${tab.id}` });
          });
        } catch { /* ignore */ }
      }
      // Overview DB views (sourceKey = 'sheet_nsg_category_wise' for OverviewWorkspace)
      entries.push({ lsKey: 'rly_dbviews_overview',                   nsKey: 'dbviews_overview' });
      entries.push({ lsKey: 'rly_dbviews_sheet_nsg_category_wise',    nsKey: 'dbviews_sheet_nsg_category_wise' });
      entries.push({ lsKey: 'rly_dbviews_sheet_policies_circulars_sop', nsKey: 'dbviews_sheet_policies_circulars_sop' });

      return entries;
    };

    const entries = buildNamespaces();
    const nsKeys = entries.map(e => e.nsKey);

    // Check if Upstash is configured first
    fetch(`${API}?debug=1`, { cache: 'no-store' })
      .then(r => r.json())
      .then(debug => {
        if (!debug.upstashConfigured) {
          setStatus({ loading: false, done: true, kvAvailable: false, namespacesSynced: 0 });
          return;
        }

        // Fetch all namespaces in parallel
        // Split into per-user and shared namespaces
        const sharedNsKeys = entries.filter(e =>
          e.nsKey.startsWith('financial_v1') ||
          e.nsKey.startsWith('fin_') ||
          e.nsKey.startsWith('tab_access_') ||
          e.nsKey.startsWith('ws_dashboard_tab_') ||
          e.nsKey.startsWith('dbviews_') ||
          // Power BI embed URLs — admin configures, all users see
          e.nsKey.startsWith('powerbi_revenue_') ||
          // Google Sheet URLs + field configs for Overview and Policies
          e.nsKey === 'sheet_nsg_category_wise' ||
          e.nsKey === 'sheet_nsg_category_wise_fields_v2' ||
          e.nsKey === 'sheet_policies_circulars_sop' ||
          e.nsKey === 'sheet_policies_circulars_sop_fields_v2' ||
          // Custom tab list
          e.nsKey === 'dashboard_custom_tabs' ||
          // Policy workspace content
          e.nsKey.startsWith('policy_ws_') ||
          // Cell workspaces — admin authors content in each cell, all users must see it
          e.nsKey.startsWith('cell_ws_') ||
          e.nsKey.startsWith('cell_rowlayout_') ||
          e.nsKey.startsWith('links_') ||
          e.nsKey.startsWith('sidebar_hidden_') ||
          e.nsKey === 'cell_registry'
        ).map(e => e.nsKey);
        const userNsKeys = nsKeys.filter(k => !sharedNsKeys.includes(k));

        return Promise.all([
          fetchAll(userId, userNsKeys),
          sharedNsKeys.length > 0 ? fetchAll(SHARED_UID, sharedNsKeys) : Promise.resolve({}),
        ]).then(([userResults, sharedResults]) => {
          const results: Record<string, string> = { ...userResults, ...sharedResults };
          let synced = 0;
          if (typeof window !== 'undefined') {
            entries.forEach(({ lsKey, nsKey }) => {
              const cloudRaw = results[nsKey];
              if (!cloudRaw) return;

              // Shared global content: always prefer cloud (it's the admin's canonical version)
              const isSharedNs = sharedNsKeys.includes(nsKey);
              if (isSharedNs) {
                localStorage.setItem(lsKey, cloudRaw);
                synced++;
                return;
              }

              const localRaw = localStorage.getItem(lsKey);
              try {
                const local = localRaw ? JSON.parse(localRaw) : null;
                const cloud = JSON.parse(cloudRaw);
                const localTime = (local as any)?.updatedAt ?? '';
                const cloudTime = (cloud as any)?.updatedAt ?? '';
                // Apply cloud if: no local data, or cloud is newer
                if (!local || cloudTime > localTime) {
                  localStorage.setItem(lsKey, cloudRaw);
                  synced++;
                }
              } catch {
                // If parsing fails, just apply cloud value
                localStorage.setItem(lsKey, cloudRaw);
                synced++;
              }
            });
          }
          setStatus({ loading: false, done: true, kvAvailable: true, namespacesSynced: synced });

          // ── Phase 2: custom tab workspace catch-up ────────────────────────
          // rly_dashboard_custom_tabs may have been empty at phase-1 scan time
          // (Prashant's device had no tabs yet). Now that it is populated from
          // _shared_, fetch any workspace content we missed.
          (() => {
            try {
              const tabs: Array<{ id: string }> = JSON.parse(
                localStorage.getItem('rly_dashboard_custom_tabs') ?? '[]'
              );
              const needed = tabs
                .map(tab => ({
                  lsKey: `workspace_v2_dashboard_tab_${tab.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  nsKey: `ws_dashboard_tab_${tab.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
                }))
                .filter(e => !localStorage.getItem(e.lsKey));   // skip already-populated

              if (needed.length > 0) {
                return fetchAll(SHARED_UID, needed.map(e => e.nsKey)).then(r2 => {
                  needed.forEach(({ lsKey, nsKey }) => {
                    const v = r2[nsKey];
                    if (v) localStorage.setItem(lsKey, v);
                  });
                });
              }
            } catch { /* ignore */ }
            return Promise.resolve();
          })().finally(() => {
            // Fire the sync event AFTER both phases complete
            if (synced > 0) {
              window.dispatchEvent(new CustomEvent('rly_cloud_sync_complete', { detail: { synced } }));
            }
          });
        });
      })
      .catch(() => {
        setStatus({ loading: false, done: true, kvAvailable: false, namespacesSynced: 0 });
      });
  }, [userId]);

  return status;
}
