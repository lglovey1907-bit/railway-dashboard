import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, latitude, longitude, geofence_m } = body;

    if (!code || !name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const geo = geofence_m ? parseInt(geofence_m) : 200;

    // Check if station already exists
    const { rows: existing } = await sql`SELECT id FROM stations WHERE code = ${cleanCode}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "A station with this code already exists." }, { status: 400 });
    }

    const { rows: inserted } = await sql`
      INSERT INTO stations (code, name, latitude, longitude, geofence_m)
      VALUES (${cleanCode}, ${cleanName}, ${latitude}, ${longitude}, ${geo})
      RETURNING *
    `;

    return NextResponse.json({ ok: true, station: inserted[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
