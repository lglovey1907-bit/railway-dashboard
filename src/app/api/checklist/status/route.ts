export const dynamic = "force-dynamic";

// app/api/checklist/status/route.ts
// Powers the "today's status" tiles on your dashboard.
// Green  = all checkpoints submitted, on time, on location, AI score >= 6
// Yellow = submitted but flagged (late / off-location / low AI score)
// Red    = missing entirely for a window that has already closed

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { STATIONS, WINDOWS } from "@/lib/stations-config";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const { rows } = await sql`
    SELECT s.code AS station_code, c.label AS checkpoint, w.label AS window,
           sub.within_geofence, sub.within_window, sub.ai_score, sub.captured_at
    FROM submissions sub
    JOIN stations s ON s.id = sub.station_id
    JOIN checkpoints c ON c.id = sub.checkpoint_id
    JOIN windows w ON w.id = sub.window_id
    WHERE sub.captured_at::date = ${today}
  `;

  const result = STATIONS.map((station) => {
    const stationRows = rows.filter((r) => r.station_code === station.code);

    const cells = station.checkpoints.flatMap((checkpoint) =>
      WINDOWS.map((w) => {
        const match = stationRows.find(
          (r) => r.checkpoint === checkpoint && r.window === w.label
        );

        const windowClosed = isWindowClosed(w.end);

        let status: "green" | "yellow" | "red" | "pending";
        if (!match) {
          status = windowClosed ? "red" : "pending";
        } else if (
          !match.within_geofence ||
          !match.within_window ||
          (match.ai_score !== null && match.ai_score < 6)
        ) {
          status = "yellow";
        } else {
          status = "green";
        }

        return { checkpoint, window: w.label, status, aiScore: match?.ai_score ?? null };
      })
    );

    const worst = cells.some((c) => c.status === "red")
      ? "red"
      : cells.some((c) => c.status === "yellow")
      ? "yellow"
      : cells.some((c) => c.status === "pending")
      ? "pending"
      : "green";

    return { station: station.code, name: station.name, overall: worst, cells };
  });

  return NextResponse.json(result);
}

function isWindowClosed(end: string): boolean {
  const [eh, em] = end.split(":").map(Number);
  const now = new Date();
  const closeTime = new Date();
  closeTime.setHours(eh, em + 15, 0, 0); // 15-min grace, matches lib/geo.ts
  return now > closeTime;
}
