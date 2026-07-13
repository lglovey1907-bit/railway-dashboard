"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, Loader2, RefreshCw, ChevronDown, ChevronUp, Fingerprint } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type AuditEntry = {
  source: string;
  employee: string;
  station_name: string;
  station_code: string;
  point_label: string;
  timestamp: string;
  spoof_confidence: number;
  spoof_reasons: string[] | null;
  device_fingerprint: string | null;
  ip_address: string | null;
  spoof_blocked: boolean;
  distance_m: number | null;
  photo_url: string | null;
};

type AuditSummary = {
  blocked: number;
  flagged: number;
  clean: number;
  total: number;
};

export function SpoofAuditWidget() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({ blocked: 0, flagged: 0, clean: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { user } = useAuthStore();

  const hasAccess = user?.role === 'admin' || user?.role === 'maintenance';

  const fetchData = () => {
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    fetch(`/api/spoof-audit?date=${date}&min=0`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setEntries(data.entries || []);
          setSummary(data.summary || { blocked: 0, flagged: 0, clean: 0, total: 0 });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (hasAccess) fetchData();
  }, [hasAccess]);

  if (!hasAccess) return null;

  const getStatusColor = (entry: AuditEntry) => {
    if (entry.spoof_blocked) return 'bg-red-50 border-red-200';
    if (entry.spoof_confidence >= 25) return 'bg-amber-50 border-amber-200';
    return 'bg-green-50/50 border-green-200';
  };

  const getStatusIcon = (entry: AuditEntry) => {
    if (entry.spoof_blocked) return <ShieldAlert className="w-4 h-4 text-red-600" />;
    if (entry.spoof_confidence >= 25) return <Shield className="w-4 h-4 text-amber-600" />;
    return <ShieldCheck className="w-4 h-4 text-green-600" />;
  };

  const getStatusLabel = (entry: AuditEntry) => {
    if (entry.spoof_blocked) return 'BLOCKED';
    if (entry.spoof_confidence >= 25) return 'FLAGGED';
    return 'CLEAN';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">GPS Spoof Audit</h3>
          <span className="text-xs text-slate-400 ml-1">Today</span>
        </div>
        <button onClick={fetchData} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <p className="text-2xl font-bold text-red-700">{summary.blocked}</p>
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Blocked</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
          <p className="text-2xl font-bold text-amber-700">{summary.flagged}</p>
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Flagged</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-2xl font-bold text-green-700">{summary.clean}</p>
          <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wider">Clean</p>
        </div>
      </div>

      {/* Entries list */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-sm">No submissions recorded today.</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={i} className={`rounded-xl border p-3 transition-all ${getStatusColor(entry)}`}>
                <button
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(entry)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{entry.employee}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {entry.station_name} &middot; {entry.point_label} &middot; {entry.source === 'qr_patrol' ? 'QR Patrol' : 'Checklist'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      entry.spoof_blocked ? 'bg-red-100 text-red-700' :
                      entry.spoof_confidence >= 25 ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {getStatusLabel(entry)} ({entry.spoof_confidence}%)
                    </span>
                    {expanded === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {expanded === i && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">Time:</span>
                        <span className="ml-1 font-medium text-slate-700">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">IP:</span>
                        <span className="ml-1 font-mono font-medium text-slate-700">{entry.ip_address || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Distance:</span>
                        <span className="ml-1 font-medium text-slate-700">{entry.distance_m != null ? `${Math.round(entry.distance_m)}m` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Fingerprint:</span>
                        <span className="ml-1 font-mono font-medium text-slate-700">{entry.device_fingerprint?.slice(0, 12) || 'N/A'}</span>
                      </div>
                    </div>
                    {entry.spoof_reasons && entry.spoof_reasons.length > 0 && (
                      <div className="bg-white/70 rounded-lg p-2 border border-slate-200/50">
                        <p className="font-bold text-slate-600 mb-1">Detection Reasons:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {(Array.isArray(entry.spoof_reasons) ? entry.spoof_reasons : []).map((reason, ri) => (
                            <li key={ri}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.photo_url && (
                      <div className="mt-2">
                        <img src={entry.photo_url.split(',')[0]} alt="Submission" className="h-20 w-auto rounded-lg object-cover border border-slate-200" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
