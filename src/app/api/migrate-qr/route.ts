import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS qr_points (
        id SERIAL PRIMARY KEY,
        station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        secret_token VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS qr_scans (
        id SERIAL PRIMARY KEY,
        point_id INTEGER REFERENCES qr_points(id) ON DELETE CASCADE,
        scanned_by VARCHAR(255) NOT NULL,
        scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return NextResponse.json({ ok: true, message: "QR tables created" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
