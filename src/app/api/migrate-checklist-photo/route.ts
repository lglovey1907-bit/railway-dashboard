import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE checklists 
      ALTER COLUMN photo_url TYPE TEXT;
    `;

    return NextResponse.json({ ok: true, message: "checklists table altered successfully" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
