import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE passenger_feedback 
      ADD COLUMN IF NOT EXISTS checkpoint_label TEXT,
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT null,
      ADD COLUMN IF NOT EXISTS ai_notes JSONB;
    `;

    return NextResponse.json({ ok: true, message: "passenger_feedback altered successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
