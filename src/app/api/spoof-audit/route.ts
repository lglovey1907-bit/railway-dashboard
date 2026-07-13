import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const minConfidence = parseInt(req.nextUrl.searchParams.get('min') || '1');

  try {
    // Combine spoof data from both qr_scans and submissions
    const { rows: qrRows } = await sql`
      SELECT 
        'qr_patrol' as source,
        s.scanned_by as employee,
        st.name as station_name,
        st.code as station_code,
        p.label as point_label,
        s.scanned_at as timestamp,
        s.spoof_confidence,
        s.spoof_reasons,
        s.device_fingerprint,
        s.ip_address,
        s.spoof_blocked,
        s.distance_m,
        s.photo_url
      FROM qr_scans s
      JOIN qr_points p ON p.id = s.point_id
      JOIN stations st ON st.id = p.station_id
      WHERE s.scanned_at::date = ${date}
        AND COALESCE(s.spoof_confidence, 0) >= ${minConfidence}
      ORDER BY s.spoof_confidence DESC, s.scanned_at DESC
      LIMIT 100
    `;

    const { rows: subRows } = await sql`
      SELECT
        'checklist' as source,
        sub.submitted_by as employee,
        st.name as station_name,
        st.code as station_code,
        c.label as point_label,
        sub.captured_at as timestamp,
        sub.spoof_confidence,
        sub.spoof_reasons,
        sub.device_fingerprint,
        sub.ip_address,
        sub.spoof_blocked,
        sub.distance_m,
        sub.photo_url
      FROM submissions sub
      JOIN stations st ON st.id = sub.station_id
      JOIN checkpoints c ON c.id = sub.checkpoint_id
      WHERE sub.captured_at::date = ${date}
        AND COALESCE(sub.spoof_confidence, 0) >= ${minConfidence}
      ORDER BY sub.spoof_confidence DESC, sub.captured_at DESC
      LIMIT 100
    `;

    const combined = [...qrRows, ...subRows].sort((a, b) => {
      return (b.spoof_confidence || 0) - (a.spoof_confidence || 0);
    });

    // Summary stats
    const blocked = combined.filter(r => r.spoof_blocked).length;
    const flagged = combined.filter(r => !r.spoof_blocked && (r.spoof_confidence || 0) >= 25).length;
    const clean = combined.filter(r => (r.spoof_confidence || 0) < 25).length;

    return NextResponse.json({
      ok: true,
      date,
      summary: { blocked, flagged, clean, total: combined.length },
      entries: combined,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
