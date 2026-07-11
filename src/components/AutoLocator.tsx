'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function AutoLocator() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Finding your location...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus('Location found. Identifying nearest station...');
        
        try {
          const res = await fetch('/api/stations');
          const data = await res.json();
          
          if (!data.ok || !data.stations || data.stations.length === 0) {
            setError('No stations found in the system.');
            return;
          }

          // Find the closest station
          let closestStation = null;
          let minDistance = Infinity;

          for (const st of data.stations) {
            if (st.latitude && st.longitude) {
              const dist = getDistance(latitude, longitude, st.latitude, st.longitude);
              if (dist < minDistance) {
                minDistance = dist;
                closestStation = st;
              }
            }
          }

          if (!closestStation) {
            setError('Could not calculate distance to any station.');
            return;
          }

          // Threshold: 10km (10000 meters)
          if (minDistance > 10000) {
            setError(`You are too far from any registered station. Closest is ${closestStation.name} (${Math.round(minDistance / 1000)}km away).`);
            return;
          }

          setStatus(`Matched with ${closestStation.name}! Redirecting...`);
          setTimeout(() => {
            router.replace(`/checklist/${closestStation.code}`);
          }, 1000);
          
        } catch (err) {
          setError('Failed to fetch stations.');
        }
      },
      (err) => {
        setError(`Location access denied or failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-rail-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin size={32} className="text-rail-600" />
        </div>
        
        <h1 className="text-xl font-bold text-slate-900 mb-2">Auto Station Locator</h1>
        
        {error ? (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex flex-col gap-3 text-sm">
            <AlertCircle size={20} className="mx-auto text-red-500" />
            <p>{error}</p>
            <button 
              onClick={() => router.push('/login')} 
              className="mt-2 text-red-600 font-semibold hover:underline"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-rail-500 animate-spin" />
            <p className="text-sm font-medium text-slate-600">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
