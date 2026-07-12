import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE submissions 
      ALTER COLUMN photo_url TYPE TEXT;
    `;

    return NextResponse.json({ ok: true, message: "submissions table altered successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
