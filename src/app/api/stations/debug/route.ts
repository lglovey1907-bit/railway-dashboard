import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Diagnostic: show all stations with their raw ids
export async function GET() {
  try {
    const { rows } = await sql`SELECT id, code, name, latitude, longitude, geofence_m FROM stations ORDER BY name`;
    return NextResponse.json({ ok: true, stations: rows }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
