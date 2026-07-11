"use client";

// components/PhotoChecklistForm.tsx
import { useState, useRef } from "react";
import { distanceMeters } from "@/lib/geo";

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
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

  const processPhoto = (file: File) => {
    setStatus({ type: "processing", message: "Acquiring GPS & watermarking..." });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Auto-select nearest checkpoint within 50m
        let bestMatch = checkpoint;
        let minDistance = 50; 
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

        // Watermark the image
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          
          // Draw original
          ctx.drawImage(img, 0, 0);
          
          // Draw watermark
          const dateStr = new Date().toLocaleString();
          const watermarkText = `${bestMatch} | ${dateStr}`;
          
          // Background bar for readability
          const barHeight = Math.max(100, img.height * 0.08);
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, img.height - barHeight, img.width, barHeight);
          
          // Text
          const fontSize = Math.max(30, img.height * 0.04);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = "white";
          ctx.fillText(watermarkText, 40, img.height - (barHeight / 2) + (fontSize / 3));

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, { type: file.type });
              setPhoto(newFile);
              setPhotoUrl(URL.createObjectURL(newFile));
              setStatus({ type: "idle" });
            }
          }, file.type);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || !submittedBy) {
      setStatus({ type: "error", message: "Enter your name and attach a photo." });
      return;
    }

    setStatus({ type: "sending", message: "Uploading..." });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const form = new FormData();
        form.append("stationCode", stationCode);
        form.append("checkpoint", checkpoint);
        form.append("window", currentWindow());
        form.append("submittedBy", submittedBy);
        form.append("latitude", String(pos.coords.latitude));
        form.append("longitude", String(pos.coords.longitude));
        form.append("capturedAt", new Date().toISOString());
        form.append("photo", photo);

        const res = await fetch("/api/checklist/submit", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) {
          setStatus({ type: "error", message: data.error ?? "Submission failed." });
          return;
        }
        setStatus({
          type: data.withinGeofence && data.withinWindow ? "ok" : "flagged",
          message: data.message,
        });
        setPhoto(null);
        setPhotoUrl(null);
      },
      () => {
        setStatus({
          type: "error",
          message: "Location permission is required to submit — please allow it and retry.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
            Photo (camera only)
            <input
              style={styles.input}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={status.type === "processing" || status.type === "sending"}
            />
          </label>

          {photoUrl && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Watermarked Preview:</p>
              <img src={photoUrl} alt="Preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #ccc" }} />
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
            disabled={status.type === "processing" || status.type === "sending"}
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1f3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#b8860b",
    fontWeight: 600,
  },
  title: { margin: "4px 0 20px", fontSize: 22, color: "#0b1f3a" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "#333" },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0b1f3a",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  notice: { fontSize: 14, marginTop: 4 },
};
