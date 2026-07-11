'use client';
import { useState } from 'react';
import { Building2, Save, Lock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StationAdmin() {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [geofence, setGeofence] = useState<number>(200);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setAuth(true);
    } else {
      alert("Incorrect password");
    }
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => alert(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || lat === '' || lng === '') return alert("Please fill all required fields");

    setLoading(true);
    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          latitude: lat,
          longitude: lng,
          geofence_m: geofence
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Station ${code.toUpperCase()} registered successfully!`, type: 'success' });
        setCode('');
        setName('');
        setLat('');
        setLng('');
        setGeofence(200);
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
          <h2 className="text-xl font-bold text-center mb-6">Station Admin Access</h2>
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
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={24} className="text-rail-600" />
            Add New Station
          </h1>
          <button onClick={() => router.push(`/`)} className="text-sm font-medium text-rail-600 hover:underline">
            Go to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSave} className="space-y-5">
            
            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Station Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SBC"
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none uppercase"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Station Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. KSR Bengaluru"
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-900 mb-2">GPS Coordinates</label>
              <p className="text-xs text-slate-500 mb-3">
                You can copy/paste these from Google Maps (Right click any place and click the coordinates to copy), or capture your current location if you are standing at the station.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <input 
                    type="number"
                    step="any"
                    value={lat}
                    onChange={e => setLat(parseFloat(e.target.value))}
                    placeholder="Latitude"
                    className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none"
                  />
                </div>
                <div>
                  <input 
                    type="number"
                    step="any"
                    value={lng}
                    onChange={e => setLng(parseFloat(e.target.value))}
                    placeholder="Longitude"
                    className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none"
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={getGPS}
                className="flex items-center gap-2 text-sm font-medium text-rail-600 hover:text-rail-700 bg-rail-50 px-4 py-2 rounded-lg"
              >
                <MapPin size={16} />
                Auto-fill current location
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-900 mb-2">Geofence Radius (Meters)</label>
              <p className="text-xs text-slate-500 mb-3">
                The maximum distance a staff member can be from the station center while submitting a photo.
              </p>
              <input 
                type="number" 
                value={geofence}
                onChange={e => setGeofence(parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rail-500 outline-none"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading || !code.trim() || !name.trim() || lat === '' || lng === ''}
                className="w-full flex justify-center items-center gap-2 bg-rail-600 text-white font-medium p-3 rounded-xl hover:bg-rail-700 disabled:opacity-50"
              >
                <Save size={18} />
                Register Station
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
