import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const stationId = req.nextUrl.searchParams.get('station_id');
  if (!stationId) {
    return NextResponse.json({ error: "Missing station_id" }, { status: 400 });
  }

  try {
    const { rows } = await sql`
      SELECT id, station_id, label, secret_token, created_at
      FROM qr_points
      WHERE station_id = ${stationId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ ok: true, qrPoints: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { station_id, label } = body;

    if (!station_id || !label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const secret_token = crypto.randomUUID();

    const { rows } = await sql`
      INSERT INTO qr_points (station_id, label, secret_token)
      VALUES (${station_id}, ${label}, ${secret_token})
      RETURNING *
    `;

    return NextResponse.json({ ok: true, qrPoint: rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await sql`DELETE FROM qr_points WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
