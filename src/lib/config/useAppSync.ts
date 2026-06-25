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
          { lsKey: `rly_links_${cn.replace(/\W/g, '_')}`,        nsKey: NS.cellLinks(cn) },
        );
      });

      // View store
      entries.push({
        lsKey: 'rly_views_sheet_nsg_category_wise',
        nsKey: NS.viewStore('sheet_nsg_category_wise'),
      });

      // Google Sheet URLs + fields
      ['sheet_nsg_category_wise', 'sheet_policies_circulars_sop'].forEach(sk => {
        entries.push(
          { lsKey: sk,                    nsKey: NS.pageSheetUrl(sk) },
          { lsKey: `${sk}_fields_v2`,     nsKey: NS.pageSheetFields(sk) },
        );
      });

      // Power BI configs
      ['powerbi_revenue_prs', 'powerbi_revenue_uts', 'powerbi_revenue_footfall', 'powerbi_revenue_tc'].forEach(pk => {
        entries.push({ lsKey: pk, nsKey: NS.powerBi(pk) });
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
        return fetchAll(userId, nsKeys).then(results => {
          let synced = 0;
          if (typeof window !== 'undefined') {
            entries.forEach(({ lsKey, nsKey }) => {
              const cloudRaw = results[nsKey];
              if (!cloudRaw) return;

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
          // Trigger a page reload if significant data was synced from cloud
          // This ensures all components re-read their localStorage values
          if (synced > 0) {
            window.dispatchEvent(new CustomEvent('rly_cloud_sync_complete', { detail: { synced } }));
          }
        });
      })
      .catch(() => {
        setStatus({ loading: false, done: true, kvAvailable: false, namespacesSynced: 0 });
      });
  }, [userId]);

  return status;
}
