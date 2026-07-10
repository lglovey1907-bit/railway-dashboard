"use client";

// components/PhotoChecklistForm.tsx
// Field-facing form. Deliberately minimal: staff open a QR-coded link on
// their phone, pick a checkpoint, take a photo, submit. GPS + timestamp are
// captured automatically — there's no field for them to type either.

import { useState } from "react";

type Props = {
  stationCode: string;
  stationName: string;
  checkpoints: string[];
  windows: { label: string; start: string; end: string }[];
};

export default function PhotoChecklistForm({
  stationCode,
  stationName,
  checkpoints,
  windows,
}: Props) {
  const [checkpoint, setCheckpoint] = useState(checkpoints[0]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<
    { type: "idle" | "sending" | "ok" | "flagged" | "error"; message?: string }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || !submittedBy) {
      setStatus({ type: "error", message: "Enter your name and attach a photo." });
      return;
    }

    setStatus({ type: "sending" });

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
            />
          </label>

          <label style={styles.label}>
            Checkpoint
            <select
              style={styles.input}
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
            >
              {checkpoints.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Photo (camera only)
            <input
              style={styles.input}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={status.type === "sending"}
            style={styles.button}
          >
            {status.type === "sending" ? "Submitting…" : "Submit"}
          </button>

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
