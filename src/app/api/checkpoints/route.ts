import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { distanceMeters } from "@/lib/geo";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { rows } = await sql`
      SELECT c.label, c.latitude, c.longitude, c.sort_order, s.code AS station_code, s.name AS station_name
      FROM checkpoints c
      JOIN stations s ON s.id = c.station_id
      ORDER BY s.code, c.sort_order
    `;
    return NextResponse.json({ ok: true, checkpoints: rows }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stationCode, label, latitude, longitude } = body;

    if (!stationCode || !label || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanStationCode = decodeURIComponent(stationCode).toUpperCase();
    const { rows: stationRows } = await sql`SELECT id, latitude, longitude FROM stations WHERE code = ${cleanStationCode}`;
    const station = stationRows[0];
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const distance = distanceMeters(latitude, longitude, station.latitude, station.longitude);
    if (distance > 1000) {
      return NextResponse.json(
        { error: `Too far! Your location is ${Math.round(distance)}m away from the station. Checkpoints must be within 1000m.` }, 
        { status: 400 }
      );
    }

    // Get max sort_order
    const { rows: maxRows } = await sql`
      SELECT MAX(sort_order) as max_order FROM checkpoints WHERE station_id = ${station.id}
    `;
    const nextOrder = (maxRows[0]?.max_order ?? 0) + 1;

    const { rows: inserted } = await sql`
      INSERT INTO checkpoints (station_id, label, sort_order, latitude, longitude)
      VALUES (${station.id}, ${label}, ${nextOrder}, ${latitude}, ${longitude})
      RETURNING *
    `;

    return NextResponse.json({ ok: true, checkpoint: inserted[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
