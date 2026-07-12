import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows: passengerRows } = await sql`
      SELECT f.station_id, s.code AS station_code, f.rating, f.photo_url, f.ai_verified, f.created_at, f.checkpoint_label
      FROM passenger_feedback f
      JOIN stations s ON s.id = f.station_id
      WHERE f.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY f.created_at DESC
    `;
    return NextResponse.json({ ok: true, data: passengerRows });
  } catch (error: any) {
    return NextResponse.json({ error: String(error), stack: error.stack }, { status: 500 });
  }
}
