import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE qr_scans 
      ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1024),
      ADD COLUMN IF NOT EXISTS latitude FLOAT,
      ADD COLUMN IF NOT EXISTS longitude FLOAT,
      ADD COLUMN IF NOT EXISTS distance_m FLOAT
    `;

    return NextResponse.json({ ok: true, message: "qr_scans table altered successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
