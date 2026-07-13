"use client";

// components/PhotoChecklistForm.tsx
import { useState, useRef, useEffect } from "react";
import { distanceMeters } from "@/lib/geo";
import { acquireGPSWithSpoofCheck, type SpoofResult } from "@/lib/geo/spoofDetector";

type Checkpoint = { label: string; lat: number | null; lng: number | null };

type Props = {
  stationCode: string;
  stationName: string;
  checkpoints: Checkpoint[];
  windows: { label: string; start: string; end: string }[];
};

export default function PhotoChecklistForm({
  stationCode,
  stationName,
  checkpoints,
  windows,
}: Props) {
  const [checkpoint, setCheckpoint] = useState(checkpoints[0]?.label || "");
  const [submittedBy, setSubmittedBy] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [spoofResult, setSpoofResult] = useState<SpoofResult | null>(null);
  
  const [status, setStatus] = useState<
    { type: "idle" | "sending" | "processing" | "ok" | "flagged" | "error"; message?: string }
  >({ type: "idle" });

  const currentWindow = () => {
    const now = new Date();
    const hhmm = now.getHours() * 60 + now.getMinutes();
    const match = windows.find((w) => {
      const [sh, sm] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      return hhmm >= sh * 60 + sm - 15 && hhmm <= eh * 60 + em + 15;
    });
    return match?.label ?? windows[0].label;
  };

  // Auto-select nearest checkpoint on mount
  useEffect(() => {
    if (navigator.geolocation && checkpoints.length > 0) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        let bestMatch = checkpoints[0].label;
        let minDistance = 200; 
        for (const cp of checkpoints) {
          if (cp.lat !== null && cp.lng !== null) {
            const dist = distanceMeters(userLat, userLng, cp.lat, cp.lng);
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = cp.label;
            }
          }
        }
        setCheckpoint(bestMatch);
      });
    }
  }, [checkpoints]);

  const processPhoto = (file: File) => {
    if (photos.length >= 5) {
      setStatus({ type: "error", message: "Maximum of 5 photos allowed." });
      return;
    }

    setStatus({ type: "processing", message: "Acquiring GPS & running anti-spoof checks..." });
    setSpoofResult(null);

    acquireGPSWithSpoofCheck(
      async (pos, spoof) => {
        setSpoofResult(spoof);

        // Block if spoofing detected
        if (spoof.isSpoofed) {
          setStatus({ type: "error", message: `⚠️ Fake GPS detected (confidence: ${spoof.confidence}%). Photo rejected. Reason: ${spoof.reasons[0] ?? 'Unknown'}` });
          return;
        }

        // Watermark the image
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          // Draw original scaled
          ctx.drawImage(img, 0, 0, width, height);
          
          // Draw watermark
          const dateStr = new Date().toLocaleString();
          const watermarkText = `${checkpoint} | ${dateStr}`;
          
          // Background bar for readability
          const barHeight = Math.max(40, height * 0.08);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, height - barHeight, width, barHeight);
          
          // Text
          const fontSize = Math.max(16, height * 0.04);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "white";
          ctx.fillText(watermarkText, 16, height - (barHeight / 2) + (fontSize / 3));

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
              setPhotos(prev => [...prev, { file: newFile, url: URL.createObjectURL(newFile) }]);
              setStatus({ type: "idle" });
            }
          }, "image/jpeg", 0.6);
        };
        img.onerror = () => {
          setStatus({ type: "error", message: "Failed to process photo." });
        };
        img.src = objUrl;
      },
      () => {
        setStatus({
          type: "error",
          message: "Location permission is required. Please allow it and re-select the photo.",
        });
      },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhoto(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0 || !submittedBy) {
      setStatus({ type: "error", message: "Enter your name and attach at least one photo." });
      return;
    }

    // Hard block on spoof
    if (spoofResult?.isSpoofed) {
      setStatus({ type: "error", message: `⚠️ Fake GPS detected. Submission blocked.` });
      return;
    }

    setStatus({ type: "sending", message: "Uploading..." });

    acquireGPSWithSpoofCheck(
      async (pos, spoof) => {
        if (spoof.isSpoofed) {
          setStatus({ type: "error", message: `⚠️ Fake GPS detected on final check. Submission blocked.` });
          return;
        }
        const form = new FormData();
        form.append("stationCode", stationCode);
        form.append("checkpoint", checkpoint);
        form.append("window", currentWindow());
        form.append("submittedBy", submittedBy);
        form.append("latitude", String(pos.coords.latitude));
        form.append("longitude", String(pos.coords.longitude));
        form.append("capturedAt", new Date().toISOString());
        if (spoof) {
          form.append("spoof_confidence", spoof.confidence.toString());
          form.append("spoof_reasons", JSON.stringify(spoof.reasons));
          form.append("device_fingerprint", spoof.deviceFingerprint || '');
        }
        
        photos.forEach(p => {
          form.append("photos", p.file);
        });

        try {
          const res = await fetch("/api/checklist/submit", { method: "POST", body: form });
          let data;
          try {
            data = await res.json();
          } catch (err) {
            setStatus({ type: "error", message: "Server error. Please try again." });
            return;
          }

          if (!res.ok) {
            setStatus({ type: "error", message: data.error ?? "Submission failed." });
            return;
          }
          setStatus({
            type: data.withinGeofence && data.withinWindow ? "ok" : "flagged",
            message: data.message,
          });
          setPhotos([]);
        } catch (error) {
          setStatus({ type: "error", message: "Network error. Please try again." });
        }
      },
      () => {
        setStatus({
          type: "error",
          message: "Location permission is required to submit — please allow it and retry.",
        });
      },
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>Sanitation checklist</p>
        <h1 style={styles.title}>{stationName}</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Your name
            <input
              style={styles.input}
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              disabled={status.type === "processing" || status.type === "sending"}
            />
          </label>

          <label style={styles.label}>
            Photos ({photos.length}/5)
            {photos.length < 5 && (
              <input
                style={styles.input}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={status.type === "processing" || status.type === "sending"}
                key={photos.length} // Reset input after each capture
              />
            )}
          </label>

          {photos.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Watermarked Previews:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {photos.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={p.url} alt={`Preview ${idx+1}`} style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }} />
                    <button 
                      type="button" 
                      onClick={() => removePhoto(idx)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label style={styles.label}>
            Checkpoint (Auto-selected if near)
            <select
              style={styles.input}
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              disabled={status.type === "processing" || status.type === "sending"}
            >
              {checkpoints.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={status.type === "processing" || status.type === "sending" || photos.length === 0}
            style={styles.button}
          >
            {status.type === "sending" ? "Submitting…" : status.type === "processing" ? "Processing…" : "Submit"}
          </button>

          {status.type === "processing" && (
            <p style={{ ...styles.notice, color: "#b8860b" }}>{status.message}</p>
          )}
          {status.type === "ok" && (
            <p style={{ ...styles.notice, color: "#1a7f4c" }}>✓ {status.message}</p>
          )}
          {status.type === "flagged" && (
            <p style={{ ...styles.notice, color: "#b45309" }}>⚠ {status.message}</p>
          )}
          {status.type === "error" && (
            <p style={{ ...styles.notice, color: "#b91c1c" }}>{status.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0b1f3a", // Navy blue
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    color: "#64748b",
    fontWeight: "bold" as const,
  },
  title: {
    margin: "4px 0 24px 0",
    fontSize: "24px",
    color: "#0f172a",
    fontWeight: "800" as const,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    fontSize: "14px",
    fontWeight: "600" as const,
    color: "#334155",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    backgroundColor: "#f8fafc",
  },
  button: {
    marginTop: "8px",
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold" as const,
    cursor: "pointer",
  },
  notice: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#f1f5f9",
    fontSize: "14px",
    textAlign: "center" as const,
    fontWeight: "500" as const,
  }
};
