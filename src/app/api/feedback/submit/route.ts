import { NextResponse, NextRequest } from "next/server";
import { sql } from "@vercel/postgres";
import { put } from "@vercel/blob";
import { distanceMeters } from "@/lib/geo";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const stationId = parseInt(form.get("stationId") as string);
    const stationCode = form.get("stationCode") as string;
    const checkpointLabel = form.get("checkpointLabel") as string;
    const rating = parseInt(form.get("rating") as string);
    const comment = form.get("comment") as string;
    const latitude = parseFloat(form.get("latitude") as string);
    const longitude = parseFloat(form.get("longitude") as string);
    const photo = form.get("photo") as File | null;
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "unknown";

    if (!stationId || !rating || !checkpointLabel || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 0. Rate Limiting (Max 3 submissions per IP per hour)
    const { rows: limitRows } = await sql`
      SELECT COUNT(*) as cnt 
      FROM passenger_feedback 
      WHERE ip_address = ${ipAddress} 
        AND created_at >= NOW() - INTERVAL '1 hour'
    `;
    if (limitRows[0] && parseInt(limitRows[0].cnt) >= 3) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    // 1. Verify Geofence (Station GPS check)
    const { rows } = await sql`SELECT latitude, longitude, geofence_m FROM stations WHERE id = ${stationId}`;
    const station = rows[0];
    if (!station) {
      return NextResponse.json({ error: "Invalid station" }, { status: 400 });
    }

    const distance = distanceMeters(latitude, longitude, station.latitude, station.longitude);
    if (distance > (station.geofence_m || 200)) {
      return NextResponse.json({ error: "You must be inside the station to submit feedback." }, { status: 400 });
    }

    // 2. Upload Photo (if present)
    let photoUrl = null;
    if (photo) {
      const blob = await put(`feedback/${stationCode}/${Date.now()}-${photo.name}`, photo, { access: "public" });
      photoUrl = blob.url;
    }

    // 3. Save to Database
    // Note: ai_verified defaults to NULL. If no photo, it stays NULL (unverified). 
    // If a photo exists, the background job will grade it and set it to true/false.
    const result = await sql`
      INSERT INTO passenger_feedback (station_id, checkpoint_label, rating, comment, photo_url, latitude, longitude, distance_m, ip_address)
      VALUES (${stationId}, ${checkpointLabel}, ${rating}, ${comment || null}, ${photoUrl}, ${latitude}, ${longitude}, ${distance}, ${ipAddress})
      RETURNING id
    `;
    const feedbackId = result.rows[0]?.id;

    // 4. Trigger AI Verification (background task, do not await)
    if (feedbackId && photoUrl) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/feedback/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, photoUrl, rating }),
      }).catch(e => console.error("Feedback score trigger failed:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
