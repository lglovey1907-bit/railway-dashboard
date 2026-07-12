"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MapPin, Camera } from "lucide-react";
import { distanceMeters } from "@/lib/geo";

type Props = {
  secret: string;
  label: string;
  station: string;
  stationLat: number;
  stationLng: number;
};

export default function ScanForm({ secret, label, station, stationLat, stationLng }: Props) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "processing">("idle");
  const [message, setMessage] = useState("");

  const processPhoto = (file: File) => {
    setStatus("processing");
    setMessage("Acquiring GPS location and processing selfie...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dist = distanceMeters(lat, lng, stationLat, stationLng);

        setUserLat(lat);
        setUserLng(lng);
        setDistance(dist);

        if (dist > 200) {
          setStatus("error");
          setMessage(`You are ${Math.round(dist)}m away from the station. You must be within 200m to log a patrol.`);
          setPhoto(null);
          setPhotoUrl(null);
          return;
        }

        // Watermark the image
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          ctx.drawImage(img, 0, 0);
          
          const dateStr = new Date().toLocaleString();
          const watermarkText = `${label} | ${Math.round(dist)}m away | ${dateStr}`;
          
          const barHeight = Math.max(100, img.height * 0.08);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, img.height - barHeight, img.width, barHeight);
          
          const fontSize = Math.max(30, img.height * 0.04);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "white";
          ctx.fillText(watermarkText, 40, img.height - (barHeight / 2) + (fontSize / 3));

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, { type: file.type });
              setPhoto(newFile);
              setPhotoUrl(URL.createObjectURL(newFile));
              setStatus("idle");
            }
          }, file.type);
        };
        img.onerror = () => {
          setStatus("error");
          setMessage("Failed to process photo.");
        };
        img.src = objUrl;
      },
      () => {
        setStatus("error");
        setMessage("Location permission is required. Please allow it and re-take the selfie.");
        setPhoto(null);
        setPhotoUrl(null);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhoto(file);
    } else {
      setPhoto(null);
      setPhotoUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !photo || userLat === null || userLng === null || distance === null) return;

    setStatus("loading");
    setMessage("Uploading patrol record...");

    try {
      const formData = new FormData();
      formData.append("secret_token", secret);
      formData.append("scanned_by", name);
      formData.append("photo", photo);
      formData.append("latitude", userLat.toString());
      formData.append("longitude", userLng.toString());
      formData.append("distance_m", distance.toString());

      const res = await fetch("/api/qr-scans", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Patrol Logged!</h1>
          <p className="text-slate-600 mb-6 font-medium">{message}</p>
          {photoUrl && <img src={photoUrl} className="w-32 h-32 object-cover rounded-xl mx-auto border-4 border-slate-100" />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4 font-sans py-12">
      <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{station}</h1>
          <p className="text-slate-500 font-medium">{label}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={status === "loading" || status === "processing"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Take Selfie (Mandatory)</label>
            {!photoUrl ? (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileChange}
                  disabled={status === "loading" || status === "processing"}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Camera size={32} className="mb-2 text-slate-400" />
                  <span className="font-medium">Tap to take selfie</span>
                  <span className="text-xs mt-1 text-slate-400 text-center">GPS coordinates will be verified</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img src={photoUrl} className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoUrl(null); }}
                  className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900/80"
                >
                  Retake
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "loading" || status === "processing" || !name.trim() || !photo}
            className="w-full bg-[#0b1f3a] text-white p-3.5 rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors mt-2"
          >
            {status === "loading" || status === "processing" ? (
              <><Loader2 className="animate-spin" size={20} /> {status === "processing" ? "Verifying..." : "Uploading..."}</>
            ) : (
              "Log Patrol"
            )}
          </button>

          {status === "error" && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
