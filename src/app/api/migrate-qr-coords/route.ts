import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE qr_points 
      ADD COLUMN IF NOT EXISTS latitude NUMERIC,
      ADD COLUMN IF NOT EXISTS longitude NUMERIC
    `;

    return NextResponse.json({ ok: true, message: "qr_points table altered successfully with latitude and longitude" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
