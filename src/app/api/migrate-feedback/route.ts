import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS passenger_feedback (
        id SERIAL PRIMARY KEY,
        station_id INTEGER REFERENCES stations(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        photo_url TEXT,
        latitude FLOAT,
        longitude FLOAT,
        distance_m FLOAT,
        ai_verified BOOLEAN DEFAULT null,
        ai_notes JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    return NextResponse.json({ ok: true, message: "passenger_feedback table created successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
