import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`
      ALTER TABLE qr_scans
      ADD COLUMN IF NOT EXISTS spoof_confidence INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS spoof_reasons JSONB,
      ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS spoof_blocked BOOLEAN DEFAULT false;
    `;

    await sql`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS spoof_confidence INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS spoof_reasons JSONB,
      ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS spoof_blocked BOOLEAN DEFAULT false;
    `;

    return NextResponse.json({ ok: true, message: "Spoof columns added to qr_scans and submissions" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
