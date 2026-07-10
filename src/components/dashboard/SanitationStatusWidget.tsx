'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

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

  useEffect(() => {
    fetch('/api/checklist/status')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch status:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white p-6 shadow-sm mb-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Live Sanitation Status (Today)</h2>
      
      {loading ? (
        <div className="text-sm text-slate-500 animate-pulse">Loading live status...</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-slate-500">No stations configured or data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((station) => (
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

              <div className="flex-1 space-y-3">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
