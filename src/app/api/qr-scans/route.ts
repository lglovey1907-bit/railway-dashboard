import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const stationCode = req.nextUrl.searchParams.get('station_code');
  
  try {
    let query;
    if (stationCode) {
      query = sql`
        SELECT s.id, s.scanned_by, s.scanned_at, p.label as point_label, st.name as station_name, st.code as station_code
        FROM qr_scans s
        JOIN qr_points p ON p.id = s.point_id
        JOIN stations st ON st.id = p.station_id
        WHERE st.code = ${stationCode}
        ORDER BY s.scanned_at DESC
        LIMIT 50
      `;
    } else {
      query = sql`
        SELECT s.id, s.scanned_by, s.scanned_at, p.label as point_label, st.name as station_name, st.code as station_code
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret_token, scanned_by } = body;

    if (!secret_token || !scanned_by) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // 2. Log scan
    await sql`
      INSERT INTO qr_scans (point_id, scanned_by)
      VALUES (${point.id}, ${scanned_by})
    `;

    return NextResponse.json({ 
      ok: true, 
      message: `Patrol logged at ${point.label} (${point.station_name})`
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
