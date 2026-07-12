"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  stationId: number;
  stationCode: string;
  stationName: string;
  stationLat: number;
  stationLng: number;
};

export default function FeedbackForm({ stationId, stationCode, stationName, stationLat, stationLng }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  const [status, setStatus] = useState<
    { type: "idle" | "sending" | "processing" | "success" | "error"; message?: string }
  >({ type: "idle" });

  const processPhoto = (file: File) => {
    setStatus({ type: "processing", message: "Processing photo..." });

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

      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
          setPhoto(newFile);
          setPhotoUrl(URL.createObjectURL(newFile));
          setStatus({ type: "idle" });
        }
      }, "image/jpeg", 0.6); // aggressively compress
    };
    img.onerror = () => {
      setStatus({ type: "error", message: "Failed to process photo." });
    };
    img.src = objUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhoto(file);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setStatus({ type: "error", message: "Please select a rating." });
      return;
    }

    setStatus({ type: "sending", message: "Locating & Submitting..." });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const form = new FormData();
        form.append("stationId", String(stationId));
        form.append("stationCode", stationCode);
        form.append("rating", String(rating));
        form.append("comment", comment);
        form.append("latitude", String(pos.coords.latitude));
        form.append("longitude", String(pos.coords.longitude));
        
        if (photo) {
          form.append("photo", photo);
        }

        try {
          const res = await fetch("/api/feedback/submit", { method: "POST", body: form });
          let data;
          try {
            data = await res.json();
          } catch (err) {
            setStatus({ type: "error", message: "Server error. Please try again later." });
            return;
          }

          if (!res.ok) {
            setStatus({ type: "error", message: data.error ?? "Submission failed." });
            return;
          }
          setStatus({
            type: "success",
            message: "Thank you for your feedback! It helps us keep the station clean.",
          });
        } catch (error) {
          setStatus({ type: "error", message: "Network error. Please try again." });
        }
      },
      () => {
        setStatus({
          type: "error",
          message: "Location permission is required to verify your feedback.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (status.type === "success") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: "bold", color: "#0f172a", marginBottom: 8 }}>Received!</h2>
            <p style={{ color: "#475569" }}>{status.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>Passenger Feedback</p>
        <h1 style={styles.title}>{stationName}</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.label}>
            How clean is the station right now?
            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <Star
                    size={40}
                    fill={(hoverRating || rating) >= star ? "#fbbf24" : "transparent"}
                    color={(hoverRating || rating) >= star ? "#fbbf24" : "#cbd5e1"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 4, minHeight: 18 }}>
              {rating === 1 && "Very Dirty"}
              {rating === 2 && "Dirty"}
              {rating === 3 && "Average"}
              {rating === 4 && "Clean"}
              {rating === 5 && "Spotless"}
            </div>
          </div>

          <label style={styles.label}>
            Optional Photo Evidence (Live Camera)
            {!photoUrl ? (
              <input
                style={styles.input}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={status.type === "processing" || status.type === "sending"}
              />
            ) : (
              <div style={{ position: 'relative', marginTop: 8 }}>
                <img src={photoUrl} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }} />
                <button 
                  type="button" 
                  onClick={() => { setPhoto(null); setPhotoUrl(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
            )}
          </label>

          <label style={styles.label}>
            Any specific issues? (Optional)
            <textarea
              style={{...styles.input, minHeight: 80, resize: "vertical"}}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Garbage bin overflowing near platform 2"
              disabled={status.type === "processing" || status.type === "sending"}
            />
          </label>

          <button
            type="submit"
            disabled={status.type === "processing" || status.type === "sending" || rating === 0}
            style={styles.button}
          >
            {status.type === "sending" ? "Submitting..." : status.type === "processing" ? "Processing Photo..." : "Submit Feedback"}
          </button>

          {status.type === "error" && (
            <p style={{ ...styles.notice, color: "#b91c1c" }}>{status.message}</p>
          )}
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>
            Your GPS location will be captured to verify you are at the station.
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "32px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
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
    gap: "20px",
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
    backgroundColor: "#fef2f2",
    fontSize: "14px",
    textAlign: "center" as const,
    fontWeight: "500" as const,
  }
};
