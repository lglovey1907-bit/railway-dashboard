import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE checkpoints 
      ADD COLUMN IF NOT EXISTS latitude FLOAT,
      ADD COLUMN IF NOT EXISTS longitude FLOAT;
    `;
    return NextResponse.json({ ok: true, message: "Migration completed successfully." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
