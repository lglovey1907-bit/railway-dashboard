"use client";

import { useEffect, useState } from "react";
import { MessageSquare, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function PassengerFeedbackWidget() {
  const [data, setData] = useState<any[]>([]);
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

  useEffect(() => {
    if (!hasAccess) return;
    fetch(`/api/checklist/status?date=${new Date().toISOString().slice(0, 10)}`)
      .then(res => res.json())
      .then(res => {
        const feedbacks: any[] = [];
        res.forEach((station: any) => {
          if (station.passengerFeedback) {
            station.passengerFeedback.forEach((f: any) => feedbacks.push({ ...f, stationName: station.name }));
          }
        });
        setData(feedbacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hasAccess]);

  if (!hasAccess) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Live Passenger Feedback</h3>
        </div>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-sm">No feedback received in the last 24 hours.</div>
        ) : (
          <div className="space-y-4">
            {data.map((f, i) => (
              <div key={i} className={`p-4 rounded-xl border ${f.rating <= 2 ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{f.stationName}</p>
                    <p className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <span key={star} className={star <= f.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                    ))}
                  </div>
                </div>
                {f.aiVerified && f.rating <= 2 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2 font-medium bg-red-100/50 w-fit px-2 py-1 rounded-md">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    AI Verified Ground Truth (Negative)
                  </div>
                )}
                {f.aiVerified && f.rating > 2 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2 font-medium bg-green-100/50 w-fit px-2 py-1 rounded-md">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AI Verified Ground Truth (Positive)
                  </div>
                )}
                {f.photoUrl && (
                  <div className="mt-3">
                    <img src={f.photoUrl} alt="Feedback" className="h-24 w-auto rounded-lg object-cover border border-slate-200" />
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
