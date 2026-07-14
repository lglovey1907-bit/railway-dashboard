import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const stationCode = req.nextUrl.searchParams.get('station_code');
  
  try {
    let query;
    if (stationCode) {
      query = sql`
        SELECT s.id, s.scanned_by, s.scanned_at, p.label as point_label, st.name as station_name, st.code as station_code, s.photo_url, s.distance_m
        FROM qr_scans s
        JOIN qr_points p ON p.id = s.point_id
        JOIN stations st ON st.id = p.station_id
        WHERE st.code = ${stationCode}
        ORDER BY s.scanned_at DESC
        LIMIT 50
      `;
    } else {
      query = sql`
        SELECT s.id, s.scanned_by, s.scanned_at, p.label as point_label, st.name as station_name, st.code as station_code, s.photo_url, s.distance_m
        FROM qr_scans s
        JOIN qr_points p ON p.id = s.point_id
        JOIN stations st ON st.id = p.station_id
        ORDER BY s.scanned_at DESC
        LIMIT 50
      `;
    }
    
    const { rows } = await query;
    return NextResponse.json({ ok: true, scans: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const secret_token = form.get("secret_token") as string;
    const scanned_by = form.get("scanned_by") as string;
    const latitude = parseFloat(form.get("latitude") as string);
    const longitude = parseFloat(form.get("longitude") as string);
    const distance_m = parseFloat(form.get("distance_m") as string);
    const photo = form.get("photo") as File;
    const spoof_confidence = parseInt(form.get("spoof_confidence") as string || '0');
    const spoof_reasons_raw = form.get("spoof_reasons") as string || '[]';
    const device_fingerprint = form.get("device_fingerprint") as string || null;

    if (!secret_token || !scanned_by || !photo || Number.isNaN(latitude)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Server-side IP extraction ──
    const forwarded = req.headers.get('x-forwarded-for');
    const ip_address = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    // ── Server-side spoof checks ──
    let serverSpoofScore = spoof_confidence;
    let serverReasons: string[] = [];
    try { serverReasons = JSON.parse(spoof_reasons_raw); } catch { serverReasons = []; }

    const serverNow = new Date();

    // ═══ SERVER CHECK 1: Independent IP Geolocation ═══
    // The server does its OWN IP lookup — this CANNOT be spoofed by the client
    try {
      const ipRes = await fetch(`https://ipinfo.io/${ip_address}/json`, {
        signal: AbortSignal.timeout(3000),
      });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.loc) {
          const [ipLat, ipLng] = ipData.loc.split(',').map(Number);
          const R = 6371;
          const dLat = ((latitude - ipLat) * Math.PI) / 180;
          const dLng = ((longitude - ipLng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(ipLat*Math.PI/180)*Math.cos(latitude*Math.PI/180)*Math.sin(dLng/2)**2;
          const ipDistKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (ipDistKm > 500) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 40);
            serverReasons.push(`SERVER IP CHECK: GPS claims ${latitude.toFixed(4)},${longitude.toFixed(4)} but server IP (${ip_address}) geolocates to ${ipData.city}, ${ipData.region} — ${Math.round(ipDistKm)}km apart`);
          } else if (ipDistKm > 100) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 20);
            serverReasons.push(`SERVER IP CHECK: GPS is ${Math.round(ipDistKm)}km from IP location (${ipData.city}) — suspicious`);
          }
        }
      }
    } catch { /* IP check is best-effort */ }

    // ═══ SERVER CHECK 2: Velocity audit ═══
    try {
      const { rows: lastScans } = await sql`
        SELECT s.latitude, s.longitude, s.scanned_at
        FROM qr_scans s
        WHERE s.scanned_by = ${scanned_by}
        ORDER BY s.scanned_at DESC LIMIT 1
      `;
      if (lastScans.length > 0) {
        const last = lastScans[0];
        const lastLat = parseFloat(last.latitude);
        const lastLng = parseFloat(last.longitude);
        const lastTime = new Date(last.scanned_at).getTime();
        const nowTime = serverNow.getTime();
        const timeDiffSec = (nowTime - lastTime) / 1000;
        if (timeDiffSec > 5 && !isNaN(lastLat) && !isNaN(lastLng)) {
          const R = 6371;
          const dLat = ((latitude - lastLat) * Math.PI) / 180;
          const dLng = ((longitude - lastLng) * Math.PI) / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(lastLat*Math.PI/180)*Math.cos(latitude*Math.PI/180)*Math.sin(dLng/2)**2;
          const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const speedKmh = (distKm / timeDiffSec) * 3600;
          if (speedKmh > 200) {
            serverSpoofScore = Math.min(100, serverSpoofScore + 30);
            serverReasons.push(`Server velocity audit: ${Math.round(speedKmh)} km/h since last scan ${Math.round(timeDiffSec)}s ago`);
          }
        }
      }
    } catch { /* velocity check is best-effort */ }

    const spoof_blocked = serverSpoofScore >= 50;

    // If blocked by server, still record but mark it
    if (spoof_blocked) {
      serverReasons.push('SERVER: Submission recorded but marked as BLOCKED due to high spoof confidence');
    }

    // 1. Verify token
    const { rows: pointRows } = await sql`
      SELECT p.id, p.label, s.name as station_name 
      FROM qr_points p
      JOIN stations s ON s.id = p.station_id
      WHERE p.secret_token = ${secret_token}
    `;

    if (pointRows.length === 0) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    }

    const point = pointRows[0];

    // 2. Upload photo to Vercel Blob
    const blob = await put(`qr-scans/${Date.now()}-${photo.name}`, photo, { access: 'public' });
    const photo_url = blob.url;

    // 3. Log scan with spoof metadata
    await sql`
      INSERT INTO qr_scans (point_id, scanned_by, photo_url, latitude, longitude, distance_m,
                            spoof_confidence, spoof_reasons, device_fingerprint, ip_address, spoof_blocked)
      VALUES (${point.id}, ${scanned_by}, ${photo_url}, ${latitude}, ${longitude}, ${distance_m},
              ${serverSpoofScore}, ${JSON.stringify(serverReasons)}::jsonb, ${device_fingerprint}, ${ip_address}, ${spoof_blocked})
    `;

    if (spoof_blocked) {
      return NextResponse.json({
        ok: false,
        error: `Submission blocked — GPS integrity check failed (confidence: ${serverSpoofScore}%)`,
        spoofBlocked: true,
      }, { status: 403 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Patrol logged at ${point.label} (${point.station_name})`,
      spoofConfidence: serverSpoofScore,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
