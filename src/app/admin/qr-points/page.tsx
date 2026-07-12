'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, QrCode, Printer, Plus, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function QRAdmin() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  
  const [stations, setStations] = useState<any[]>([]);
  const [stationId, setStationId] = useState<string>('');
  const [label, setLabel] = useState('');
  
  const [qrPoints, setQrPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth) {
      fetch('/api/stations/debug') // use debug API which returns raw IDs
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setStations(data.stations);
            if (data.stations.length > 0) setStationId(data.stations[0].id.toString());
          }
        });
    }
  }, [auth]);

  useEffect(() => {
    if (auth && stationId) {
      fetchQRPoints();
    }
  }, [auth, stationId]);

  const fetchQRPoints = () => {
    fetch(`/api/qr-points?station_id=${stationId}&_=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setQrPoints(data.qrPoints);
      });
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') setAuth(true);
    else alert('Incorrect password');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    
    setLoading(true);
    const res = await fetch('/api/qr-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_id: stationId, label })
    });
    
    if (res.ok) {
      setLabel('');
      fetchQRPoints();
    } else {
      const data = await res.json();
      alert(data.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR point?')) return;
    const res = await fetch(`/api/qr-points?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchQRPoints();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="w-12 h-12 bg-rail-50 text-rail-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-center mb-6">QR Admin Access</h2>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full border border-slate-300 rounded-lg p-3 mb-4"
          />
          <button type="submit" className="w-full bg-rail-600 text-white font-medium p-3 rounded-lg hover:bg-rail-700">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page p-4">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode size={24} className="text-rail-600" />
            Manage QR Patrol Points
          </h1>
          <a href="/" className="text-sm font-medium text-rail-600 hover:underline">Go to Dashboard</a>
        </div>

        <div className="grid md:grid-cols-3 gap-6 no-print">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-4">1. Select Station</h2>
              <select 
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rail-500"
              >
                {stations.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-4">2. Create New QR</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Platform 1 End Pillar"
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rail-500"
                />
                <button
                  type="submit"
                  disabled={loading || !label.trim()}
                  className="w-full bg-rail-600 text-white p-3 rounded-xl font-medium hover:bg-rail-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Point
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Generated QR Codes</h2>
                {qrPoints.length > 0 && (
                  <button onClick={handlePrint} className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200">
                    <Printer size={16} /> Print All
                  </button>
                )}
              </div>
              
              {qrPoints.length === 0 ? (
                <p className="text-slate-500 text-sm">No QR points created for this station yet.</p>
              ) : (
                <div id="print-area" className="grid grid-cols-2 gap-4">
                  {qrPoints.map(point => {
                    // Generate full URL for the QR code
                    const scanUrl = \`\${window.location.origin}/scan/\${point.secret_token}\`;
                    return (
                      <div key={point.id} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
                        <div className="mb-4 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <QRCode value={scanUrl} size={120} />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{point.label}</h3>
                        <p className="text-xs text-slate-500 mb-4 max-w-[150px] truncate" title={point.secret_token}>{point.secret_token}</p>
                        <button 
                          onClick={() => handleDelete(point.id)}
                          className="no-print flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
