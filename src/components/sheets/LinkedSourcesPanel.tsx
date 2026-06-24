'use client';
/**
 * LinkedSourcesPanel — shows all sheets linked to the overview page,
 * their sync status, and whether they're stored in Upstash (cross-device)
 * or localStorage only (device-specific).
 */
import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Cloud, Monitor, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedSource {
  namespace: string;
  label: string;
  url: string;
  rows: number;
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  linkedAt: string;
  linkedBy: string;
}

interface LinkedSourcesPanelProps {
  sources: LinkedSource[];
  kvAvailable: boolean;
  onRefetch: (namespace: string) => void;
  onUnlink: (namespace: string) => void;
}

function timeStr(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function rowsLabel(n: number) {
  return n.toLocaleString('en-IN');
}

export function LinkedSourcesPanel({ sources, kvAvailable, onRefetch, onUnlink }: LinkedSourcesPanelProps) {
  const connected = sources.filter(s => s.url);

  if (connected.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Database size={13} className="text-indigo-600"/>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Linked Data Sources</p>
            <p className="text-[10px] text-slate-400">
              {connected.length} source{connected.length !== 1 ? 's' : ''} connected ·{' '}
              {kvAvailable ? (
                <span className="text-emerald-600 font-medium flex items-center gap-0.5 inline-flex">
                  <Cloud size={9}/> Cross-device sync active
                </span>
              ) : (
                <span className="text-amber-600 font-medium flex items-center gap-0.5 inline-flex">
                  <Monitor size={9}/> Device-only storage
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Source table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Records</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Sync</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Linked By</th>
              <th className="px-4 py-2.5"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {connected.map(src => (
              <tr key={src.namespace} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                      <Database size={11} className="text-emerald-600"/>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{src.label}</p>
                      <a href={src.url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-rail-600 flex items-center gap-0.5 truncate max-w-[200px]">
                        {src.url.replace('https://', '').slice(0, 40)}… <ExternalLink size={8}/>
                      </a>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-semibold">
                    Google Sheet
                  </span>
                </td>
                <td className="px-4 py-3">
                  {src.loading ? (
                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin"/> Syncing…
                    </span>
                  ) : src.error ? (
                    <span className="text-[10px] text-red-600 flex items-center gap-1">
                      <AlertCircle size={10}/> Error
                    </span>
                  ) : src.rows > 0 ? (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={10}/> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">No data</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-700">{rowsLabel(src.rows)}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{timeStr(src.fetchedAt)}</td>
                <td className="px-4 py-3 text-slate-400">{src.linkedBy || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onRefetch(src.namespace)} title="Sync now"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                      <RefreshCw size={12}/>
                    </button>
                    <button onClick={() => { if (confirm(`Unlink "${src.label}"?`)) onUnlink(src.namespace); }}
                      title="Unlink this source"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Storage type note */}
      <div className={cn('px-5 py-2.5 border-t border-slate-100 text-[10px] flex items-center gap-1.5',
        kvAvailable ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
        {kvAvailable ? (
          <><Cloud size={10}/> Stored in Upstash Redis — visible from all devices and browsers</>
        ) : (
          <><Monitor size={10}/> Stored in browser only — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel to enable cross-device sync</>
        )}
      </div>
    </div>
  );
}
