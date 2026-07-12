// app/api/checklist/submit/route.ts
// Receives one checkpoint photo submission from the field form.
// Validates GPS + timestamp, stores the photo, writes the row, then
// (fire-and-forget) queues it for AI scoring.

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { distanceMeters, withinWindow } from "@/lib/geo";


export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const stationCode = form.get("stationCode") as string;
    const checkpointLabel = form.get("checkpoint") as string;
    const windowLabel = form.get("window") as string;
    const submittedBy = form.get("submittedBy") as string;
    const latitude = parseFloat(form.get("latitude") as string);
    const longitude = parseFloat(form.get("longitude") as string);
    const capturedAtRaw = form.get("capturedAt") as string; // ISO string from device
    const photos = form.getAll("photos") as File[];

    if (!stationCode || !checkpointLabel || photos.length === 0 || Number.isNaN(latitude)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanStationCode = decodeURIComponent(stationCode).toUpperCase();
    const { rows } = await sql`SELECT * FROM stations WHERE code = ${cleanStationCode}`;
    const station = rows[0];
    if (!station) {
      return NextResponse.json({ error: "Unknown station" }, { status: 400 });
    }

    const capturedAt = new Date(capturedAtRaw);
    const distance = distanceMeters(latitude, longitude, station.latitude, station.longitude);
    const withinGeofence = distance <= station.geofence_m;

    const { rows: windowRows } = await sql`SELECT * FROM windows WHERE label = ${windowLabel}`;
    const windowDef = windowRows[0]
      ? { start: windowRows[0].start_time, end: windowRows[0].end_time }
      : null;
    const withinWindowOk = windowDef
      ? withinWindow(capturedAt, windowDef.start, windowDef.end)
      : false;

    // 1. Store the photos. Vercel Blob is the path of least resistance on Vercel;
    // swap for S3/Cloudinary if you prefer.
    const uploadPromises = photos.map(photo => 
      put(
        `checklist/${stationCode}/${Date.now()}-${photo.name}`,
        photo,
        { access: "public" }
      )
    );
    const blobs = await Promise.all(uploadPromises);
    const photoUrlString = blobs.map(b => b.url).join(",");

    // 2. Write the row. Flag it clearly even if it fails validation —
    // we still want a record of the attempt, not a silent reject.
    const result = await sql`
      INSERT INTO submissions (
        station_id, checkpoint_id, window_id, submitted_by, photo_url,
        latitude, longitude, distance_m, captured_at,
        within_geofence, within_window
      )
      SELECT
        s.id, c.id, w.id, ${submittedBy}, ${photoUrlString},
        ${latitude}, ${longitude}, ${distance}, ${capturedAt.toISOString()}::timestamptz,
        ${withinGeofence}, ${withinWindowOk}
      FROM stations s, checkpoints c, windows w
      WHERE s.code = ${stationCode}
        AND c.station_id = s.id AND c.label = ${checkpointLabel}
        AND w.label = ${windowLabel}
      RETURNING id
    `;

    const submissionId = result.rows[0]?.id;

    // 3. Queue AI scoring — don't block the staff member's upload on this.
    if (submissionId) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/checklist/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, photoUrl: blobs[0].url }),
      }).catch((e) => console.error("Score dispatch failed:", e));
    }

    return NextResponse.json({
      ok: true,
      withinGeofence,
      withinWindow: withinWindowOk,
      message:
        withinGeofence && withinWindowOk
          ? "Submission accepted."
          : "Submission recorded but flagged — outside expected location or time window.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
