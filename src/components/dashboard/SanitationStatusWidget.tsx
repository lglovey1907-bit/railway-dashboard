'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  }[];
};

function StatusIcon({ status, className, size = 20 }: { status: Status; className?: string; size?: number }) {
  if (status === 'green') return <CheckCircle2 size={size} className={`text-green-500 ${className || ''}`} />;
  if (status === 'yellow') return <AlertCircle size={size} className={`text-yellow-500 ${className || ''}`} />;
  if (status === 'red') return <XCircle size={size} className={`text-red-500 ${className || ''}`} />;
  return <Clock size={size} className={`text-slate-400 ${className || ''}`} />;
}

export function SanitationStatusWidget() {
  const [data, setData] = useState<StationStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const toggle = (stationCode: string) => {
    setExpanded(prev => ({ ...prev, [stationCode]: !prev[stationCode] }));
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/checklist/status?date=${selectedDate}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch status:", err);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sanitation Status</h2>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rail-500 focus:border-rail-500 outline-none transition-all"
        />
      </div>
      
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
                  <div className="flex-1 space-y-3 mt-4 pt-4 border-t border-slate-100">
                    {station.cells.map((cell, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-medium">{cell.checkpoint}</span>
                          <span className="text-xs text-slate-400">{cell.window} Window</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {cell.aiScore !== null && (
                            <span className={`text-xs font-bold ${cell.aiScore >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                              Score: {cell.aiScore}/10
                            </span>
                          )}
                          <StatusIcon status={cell.status} size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
