"use client";

import { useEffect, useState } from "react";
import { QrCode, Clock, MapPin, Loader2, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function QRPatrolWidget() {
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let access = false;
    if (user?.role === 'admin' || user?.role === 'maintenance') access = true;
    else if ((user as any)?.cells?.includes('Sanitation') || user?.cell === 'Sanitation') access = true;
    else {
      try {
        const mems = JSON.parse(localStorage.getItem('rly_cell_memberships') ?? '[]');
        const approved = mems.filter((m: any) => m.employeeId === user?.id && m.approvalStatus === 'approved').map((m: any) => m.cellName);
        if (approved.includes('Sanitation')) access = true;
      } catch {}
    }
    setHasAccess(access);
  }, [user]);

  const fetchData = () => {
    if (!hasAccess) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/qr-scans?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) setScans(data.scans);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  if (!hasAccess) return null;

  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="text-rail-600" size={24} /> 
          Recent QR Patrols
        </h2>
        <button
          onClick={fetchData}
          disabled={loading}
          title="Refresh data"
          className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && scans.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center">No QR patrols logged recently.</div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rail-50 text-rail-600 rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{scan.point_label}</p>
                  <p className="text-xs text-slate-500">{scan.station_name} ({scan.station_code}) • by {scan.scanned_by}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                <Clock size={12} />
                {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
