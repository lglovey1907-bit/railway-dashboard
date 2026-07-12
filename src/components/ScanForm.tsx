"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";

export default function ScanForm({ secret, label, station }: { secret: string, label: string, station: string }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/qr-scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_token: secret, scanned_by: name })
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
          <div className="text-sm text-slate-400">
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{station}</h1>
          <p className="text-slate-500 font-medium">{label}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full border border-slate-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              required
              disabled={status === "loading"}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !name.trim()}
            className="w-full bg-[#0b1f3a] text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors"
          >
            {status === "loading" ? (
              <><Loader2 className="animate-spin" size={24} /> Logging...</>
            ) : (
              "Log Patrol"
            )}
          </button>

          {status === "error" && (
            <p className="text-red-500 text-center text-sm font-medium mt-4">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
