'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, RefreshCw, Globe } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type Status = "green" | "yellow" | "red" | "pending";

type StationStatus = {
  station: string;
  name: string;
  overall: Status;
  cells: {
    checkpoint: string;
    window: string;
    status: Status;
    aiScore: number | null;
    photoUrl: string | null;
    distance: number | null;
    submittedBy: string | null;
    capturedAt: string | null;
    aiScoredAt: string | null;
    aiNotes: any | null;
    withinGeofence?: boolean | null;
    withinWindow?: boolean | null;
  }[];
  passengerFeedback?: {
    rating: number;
    photoUrl: string | null;
    aiVerified: boolean | null;
    createdAt: string;
  }[];
};

function StatusIcon({ status, className, size = 20 }: { status: Status; className?: string; size?: number }) {
  if (status === 'green') return <CheckCircle2 size={size} className={`text-green-500 ${className || ''}`} />;
  if (status === 'yellow') return <AlertCircle size={size} className={`text-yellow-500 ${className || ''}`} />;
  if (status === 'red') return <XCircle size={size} className={`text-red-500 ${className || ''}`} />;
  return <Clock size={size} className={`text-slate-400 ${className || ''}`} />;
}

function CheckpointRow({ cell }: { cell: StationStatus['cells'][0] }) {
  const [open, setOpen] = useState(false);
  const hasData = cell.status !== 'pending' && cell.status !== 'red';

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden transition-all bg-white">
      <div 
        onClick={() => hasData && setOpen(!open)}
        className={`flex items-center justify-between p-3 ${hasData ? 'cursor-pointer hover:bg-slate-50' : 'opacity-75'}`}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-700 font-medium text-sm flex items-center gap-2">
            {cell.checkpoint}
            {hasData && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                {open ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} Details
              </span>
            )}
          </span>
          <span className="text-xs text-slate-400">{cell.window} Window</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {cell.withinGeofence === false && <span title="Outside Location"><Globe size={16} className="text-yellow-500" /></span>}
            {cell.withinWindow === false && <span title="Outside Time Window"><Clock size={16} className="text-yellow-500" /></span>}
          </div>
          {cell.aiScore !== null && (
            <span className={`text-xs font-bold ${cell.aiScore >= 6 ? 'text-green-600' : 'text-red-600'}`}>
              Score: {cell.aiScore}/10
            </span>
          )}
          <StatusIcon status={cell.status} size={16} />
        </div>
      </div>
      
      {open && hasData && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex flex-col gap-3">
          
          <div className="grid grid-cols-2 gap-2">
            {cell.photoUrl && (
              <div className="col-span-2 sm:col-span-1">
                <p className="font-semibold text-slate-700 mb-1">Photo Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  {cell.photoUrl.split(',').map((url: string, i: number) => (
                    <div key={i}>
                      <img src={url} alt={`Checkpoint ${i+1}`} className="w-full h-24 object-cover rounded-md border border-slate-200" />
                      <a href={url} target="_blank" rel="noreferrer" className="text-rail-600 hover:underline mt-1 inline-block text-[10px]">View Full</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
              <div>
                <p className="font-semibold text-slate-700">Distance from location</p>
                <p>{cell.distance !== null ? `${Math.round(cell.distance)} meters` : 'Unknown'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Submitted By</p>
                <p>{cell.submittedBy || 'Unknown Staff'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Captured At</p>
                <p>{cell.capturedAt ? new Date(cell.capturedAt).toLocaleString() : 'Unknown'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Received At</p>
                <p>{cell.aiScoredAt ? new Date(cell.aiScoredAt).toLocaleString() : 'Processing...'}</p>
              </div>
            </div>
          </div>

          {cell.aiNotes && (
            <div className="mt-2 bg-white p-3 rounded-md border border-slate-100 shadow-sm">
              <p className="font-semibold text-slate-700 mb-1">AI Notes</p>
              {cell.aiNotes.issues && cell.aiNotes.issues.length > 0 && (
                <ul className="list-disc list-inside text-red-600 mb-2">
                  {cell.aiNotes.issues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                </ul>
              )}
              {cell.aiNotes.notes && (
                <p className="text-slate-600">{cell.aiNotes.notes}</p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export function SanitationStatusWidget() {
  const [data, setData] = useState<StationStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { user } = useAuthStore();
  const [hasSanitationAccess, setHasSanitationAccess] = useState(false);

  const toggle = (stationCode: string) => {
    setExpanded(prev => ({ ...prev, [stationCode]: !prev[stationCode] }));
  };

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
    setHasSanitationAccess(access);
  }, [user]);

  const fetchData = () => {
    if (!hasSanitationAccess) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/checklist/status?date=${selectedDate}&_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    })
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { console.error("Failed to fetch status:", err); setLoading(false); });
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, hasSanitationAccess]);


  if (!hasSanitationAccess) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sanitation Status</h2>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rail-500 focus:border-rail-500 outline-none transition-all"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
      {loading ? (
        <div className="text-sm text-slate-500 animate-pulse">Loading live status...</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-slate-500">No stations configured or data available for this date.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((station) => {
            const isExpanded = expanded[station.station];
            
            const morning = station.cells.filter(c => c.window.toLowerCase().includes('morning'));
            const evening = station.cells.filter(c => c.window.toLowerCase().includes('evening'));
            
            const mUpdated = morning.filter(c => c.status === 'green' || c.status === 'yellow').length;
            const eUpdated = evening.filter(c => c.status === 'green' || c.status === 'yellow').length;

            return (
              <div key={station.station} className="border border-slate-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-slate-900">{station.name}</h3>
                    <p className="text-xs text-slate-500">{station.station}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <StatusIcon status={station.overall} size={18} />
                    <span className="text-xs font-medium capitalize text-slate-700">{station.overall}</span>
                  </div>
                </div>

                {station.cells.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <p className="text-sm text-slate-400">No checkpoints registered yet.</p>
                    <a
                      href="/admin/checkpoints"
                      className="text-xs font-semibold text-rail-600 hover:underline"
                    >
                      + Add Checkpoint
                    </a>
                  </div>
                ) : (
                  <>
                    {!isExpanded && (
                      <div className="flex flex-col gap-2 mb-4 text-sm">
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700">M - {morning.length}</span>
                          <span className="text-slate-500">Status - <span className="font-medium text-slate-900">{mUpdated} updated</span></span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700">E - {evening.length}</span>
                          <span className="text-slate-500">Status - <span className="font-medium text-slate-900">{eUpdated} updated</span></span>
                        </div>
                      </div>
                    )}

                    {station.passengerFeedback && station.passengerFeedback.some(f => f.rating <= 2 && f.aiVerified === true) && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={16} className="text-red-600" />
                          <span className="text-sm font-bold text-red-900">Passenger Mismatch Alert</span>
                        </div>
                        <div className="text-xs text-red-800 space-y-2">
                          {station.passengerFeedback.filter(f => f.rating <= 2 && f.aiVerified === true).map((f, i) => (
                            <div key={i} className="flex gap-2 items-start bg-white/50 p-2 rounded">
                              {f.photoUrl && <img src={f.photoUrl} className="w-12 h-12 object-cover rounded" />}
                              <div>
                                <span className="font-semibold">Rated {f.rating}/5 Stars</span>
                                <p className="text-[10px] text-red-600 mt-1">AI Verified Passenger Ground Truth</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => toggle(station.station)}
                      className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      {isExpanded ? (
                        <><ChevronUp size={14} /> Hide Details</>
                      ) : (
                        <><ChevronDown size={14} /> View All {station.cells.length} Checkpoints</>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="flex-1 space-y-2 mt-4 pt-4 border-t border-slate-100">
                        {station.cells.map((cell, idx) => (
                          <CheckpointRow key={idx} cell={cell} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
