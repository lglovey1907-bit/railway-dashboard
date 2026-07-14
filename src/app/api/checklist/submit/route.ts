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
    const capturedAtRaw = form.get("capturedAt") as string;
    const photos = form.getAll("photos") as File[];
    const spoof_confidence_raw = parseInt(form.get("spoof_confidence") as string || '0');
    const spoof_reasons_raw = form.get("spoof_reasons") as string || '[]';
    const device_fingerprint = form.get("device_fingerprint") as string || null;

    if (!stationCode || !checkpointLabel || photos.length === 0 || Number.isNaN(latitude)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Server-side IP extraction ──
    const forwarded = req.headers.get('x-forwarded-for');
    const ip_address = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    // ── Server-side spoof checks ──
    let serverSpoofScore = spoof_confidence_raw;
    let serverReasons: string[] = [];
    try { serverReasons = JSON.parse(spoof_reasons_raw); } catch { serverReasons = []; }

    const cleanStationCode = decodeURIComponent(stationCode).toUpperCase();
    const { rows } = await sql`SELECT * FROM stations WHERE code = ${cleanStationCode}`;
    const station = rows[0];
    if (!station) {
      return NextResponse.json({ error: "Unknown station" }, { status: 400 });
    }

    const capturedAt = new Date(capturedAtRaw);

    // Check 1: Timestamp drift — device time vs server time
    const serverNow = new Date();
    const driftMs = Math.abs(serverNow.getTime() - capturedAt.getTime());
    if (driftMs > 5 * 60 * 1000) { // > 5 minutes
      serverSpoofScore = Math.min(100, serverSpoofScore + 15);
      serverReasons.push(`Server timestamp drift: device time is ${Math.round(driftMs / 1000)}s off from server`);
    }

    // Check 2: Server-side IP geolocation — cannot be spoofed by client
    try {
      const ipRes = await fetch(`https://ipinfo.io/${ip_address}/json`, {
        signal: AbortSignal.timeout(3000),
      });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.loc) {
          const [ipLat, ipLng] = ipData.loc.split(',').map(Number);
          const R = 6371;
          const dLat2 = ((latitude - ipLat) * Math.PI) / 180;
          const dLng2 = ((longitude - ipLng) * Math.PI) / 180;
          const a2 = Math.sin(dLat2/2)**2 + Math.cos(ipLat*Math.PI/180)*Math.cos(latitude*Math.PI/180)*Math.sin(dLng2/2)**2;
          const ipDistKm = R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
          if (ipDistKm > 500) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 40);
            serverReasons.push(`SERVER IP CHECK: GPS ${Math.round(ipDistKm)}km from IP (${ipData.city}, ${ipData.region})`);
          } else if (ipDistKm > 100) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 20);
            serverReasons.push(`SERVER IP CHECK: GPS ${Math.round(ipDistKm)}km from IP (${ipData.city})`);
          }
        }
      }
    } catch { /* IP check is best-effort */ }

    const distance = distanceMeters(latitude, longitude, station.latitude, station.longitude);
    const withinGeofence = distance <= station.geofence_m;

    // Check 2: Velocity audit — check last submission by same person
    try {
      const { rows: lastSubs } = await sql`
        SELECT latitude, longitude, captured_at
        FROM submissions
        WHERE submitted_by = ${submittedBy}
        ORDER BY captured_at DESC LIMIT 1
      `;
      if (lastSubs.length > 0) {
        const last = lastSubs[0];
        const lastLat = parseFloat(last.latitude);
        const lastLng = parseFloat(last.longitude);
        const lastTime = new Date(last.captured_at).getTime();
        const timeDiffSec = (serverNow.getTime() - lastTime) / 1000;
        if (timeDiffSec > 5 && !isNaN(lastLat) && !isNaN(lastLng)) {
          const R = 6371;
          const dLat = ((latitude - lastLat) * Math.PI) / 180;
          const dLng = ((longitude - lastLng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(lastLat*Math.PI/180)*Math.cos(latitude*Math.PI/180)*Math.sin(dLng/2)**2;
          const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const speedKmh = (distKm / timeDiffSec) * 3600;
          if (speedKmh > 200) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 30);
            serverReasons.push(`Server velocity audit: ${Math.round(speedKmh)} km/h since last submission ${Math.round(timeDiffSec)}s ago`);
          }
        }
      }
    } catch { /* velocity check is best-effort */ }

    const spoof_blocked = serverSpoofScore >= 50;

    const { rows: windowRows } = await sql`SELECT * FROM windows WHERE label = ${windowLabel}`;
    const windowDef = windowRows[0]
      ? { start: windowRows[0].start_time, end: windowRows[0].end_time }
      : null;
    const withinWindowOk = windowDef
      ? withinWindow(capturedAt, windowDef.start, windowDef.end)
      : false;

    // 1. Store the photos. Vercel Blob is the path of least resistance on Vercel;
    // swap for S3/Cloudinary if you prefer.
    const uploadPromises = photos.map((photo, i) => 
      put(
        `checklist/${stationCode}/${Date.now()}-${i}-${photo.name}`,
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
        within_geofence, within_window,
        spoof_confidence, spoof_reasons, device_fingerprint, ip_address, spoof_blocked
      )
      SELECT
        s.id, c.id, w.id, ${submittedBy}, ${photoUrlString},
        ${latitude}, ${longitude}, ${distance}, ${capturedAt.toISOString()}::timestamptz,
        ${withinGeofence}, ${withinWindowOk},
        ${serverSpoofScore}, ${JSON.stringify(serverReasons)}::jsonb, ${device_fingerprint}, ${ip_address}, ${spoof_blocked}
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

    let message = "Submission accepted.";
    if (spoof_blocked) {
      return NextResponse.json({
        ok: false,
        error: `Submission blocked \u2014 GPS integrity check failed (confidence: ${serverSpoofScore}%)`,
        spoofBlocked: true,
      }, { status: 403 });
    }
    if (!withinGeofence && !withinWindowOk) {
      message = "Submission recorded but flagged \u2014 outside expected location and time window.";
    } else if (!withinGeofence) {
      message = "Submission recorded but flagged \u2014 outside expected location.";
    } else if (!withinWindowOk) {
      message = "Submission recorded but flagged \u2014 outside expected time window.";
    }

    return NextResponse.json({
      ok: true,
      withinGeofence,
      withinWindow: withinWindowOk,
      message,
      spoofConfidence: serverSpoofScore,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
