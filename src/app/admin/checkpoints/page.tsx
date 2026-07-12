'use client';
import { useState, useEffect } from 'react';
import { MapPin, Save, Lock, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Station = { code: string; name: string };

export default function CheckpointAdmin() {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  
  const [stations, setStations] = useState<Station[]>([]);
  const [stationCode, setStationCode] = useState('');
  const [existingCheckpoints, setExistingCheckpoints] = useState<{label:string, latitude:number, longitude:number}[]>([]);
  
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (auth) {
      fetch('/api/stations')
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setStations(data.stations);
            if (data.stations.length > 0) {
              setStationCode(data.stations[0].code);
            }
          }
        });
    }
  }, [auth]);

  useEffect(() => {
    if (auth && stationCode) {
      fetch(`/api/checkpoints?station=${stationCode}&_=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            const filtered = data.checkpoints.filter((c: any) => c.station_code === stationCode);
            setExistingCheckpoints(filtered);
          }
        });
    }
  }, [auth, stationCode, message]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setAuth(true);
    } else {
      alert("Incorrect password");
    }
  };

  const getGPS = () => {
    setLoading(true);
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ text: 'Geolocation is not supported by your browser.', type: 'error' });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLoading(false);
        setMessage({ text: 'GPS locked successfully!', type: 'success' });
      },
      (err) => {
        setMessage({ text: `GPS Error: ${err.message}`, type: 'error' });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationCode) return alert("Select a station");
    if (!label.trim()) return alert("Enter checkpoint name");
    if (lat === null || lng === null) return alert("Capture GPS first");

    setLoading(true);
    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationCode,
          label,
          latitude: lat,
          longitude: lng
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Checkpoint "${label}" registered successfully!`, type: 'success' });
        setLabel('');
        setLat(null);
        setLng(null);
      } else {
        setMessage({ text: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error', type: 'error' });
    }
    setLoading(false);
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="w-12 h-12 bg-rail-50 text-rail-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-center mb-6">Checkpoint Admin Access</h2>
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
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <LayoutList size={24} className="text-rail-600" />
             Add Checkpoint
          </h1>
          <button onClick={() => router.push(`/`)} className="text-sm font-medium text-rail-600 hover:underline">
            Go to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">1. Select Station</label>
              <select 
                value={stationCode}
                onChange={e => setStationCode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none"
              >
                {stations.length === 0 && <option value="">Loading stations...</option>}
                {stations.map(st => (
                  <option key={st.code} value={st.code}>{st.name} ({st.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">2. Stand at the location</label>
              <button 
                type="button" 
                onClick={getGPS}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white font-medium p-3 rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                <MapPin size={18} />
                {lat && lng ? 'Update Coordinates' : 'Capture GPS Coordinates'}
              </button>
              {lat && lng && (
                <p className="text-xs text-green-600 mt-2 font-medium">
                  ✓ Coordinates locked: {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">3. Name the checkpoint</label>
              <input 
                type="text" 
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Waiting room number 1"
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 focus:border-rail-500 outline-none"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading || !lat || !lng || !label.trim() || !stationCode}
                className="w-full flex justify-center items-center gap-2 bg-rail-600 text-white font-medium p-3 rounded-xl hover:bg-rail-700 disabled:opacity-50"
              >
                <Save size={18} />
                Save to Database
              </button>
            </div>

          </form>
        </div>

        {/* Existing checkpoints list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Registered Checkpoints for this Station ({existingCheckpoints.length})
          </h2>
          {existingCheckpoints.length === 0 ? (
            <p className="text-sm text-slate-400">No checkpoints registered yet for this station.</p>
          ) : (
            <ul className="space-y-2">
              {existingCheckpoints.map((cp, i) => (
                <li key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <MapPin size={14} className="text-rail-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">{cp.label}</p>
                    <p className="text-xs text-slate-400">{Number(cp.latitude).toFixed(6)}, {Number(cp.longitude).toFixed(6)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
