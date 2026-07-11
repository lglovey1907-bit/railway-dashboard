import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
  const { rows } = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'checkpoints'
  `;
  return NextResponse.json(rows);
}
