// app/api/checklist/status/route.ts
// Powers the "today's status" tiles on your dashboard.
// Green  = all checkpoints submitted, on time, on location, AI score >= 6
// Yellow = submitted but flagged (late / off-location / low AI score)
// Red    = missing entirely for a window that has already closed

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";


export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  // Fetch today's submissions
  const { rows } = await sql`
    SELECT s.code AS station_code, c.label AS checkpoint, w.label AS window,
           sub.within_geofence, sub.within_window, sub.ai_score, sub.captured_at
    FROM submissions sub
    JOIN stations s ON s.id = sub.station_id
    JOIN checkpoints c ON c.id = sub.checkpoint_id
    JOIN windows w ON w.id = sub.window_id
    WHERE sub.captured_at::date = ${today}
  `;

  // Fetch stations and their checkpoints from DB (replaces STATIONS static array)
  const { rows: stationRows } = await sql`
    SELECT s.id, s.code, s.name, c.label AS checkpoint
    FROM stations s
    JOIN checkpoints c ON c.station_id = s.id
    ORDER BY s.code, c.sort_order
  `;

  // Fetch windows from DB (replaces WINDOWS static array)
  const { rows: windowRows } = await sql`
    SELECT label, end_time AS end FROM windows ORDER BY start_time
  `;

  // Group checkpoints by station
  const stationsMap = new Map<string, { code: string; name: string; checkpoints: string[] }>();
  for (const row of stationRows) {
    if (!stationsMap.has(row.code)) {
      stationsMap.set(row.code, { code: row.code, name: row.name, checkpoints: [] });
    }
    stationsMap.get(row.code)!.checkpoints.push(row.checkpoint);
  }

  const result = Array.from(stationsMap.values()).map((station) => {
    const submissionsForStation = rows.filter((r) => r.station_code === station.code);

    const cells = station.checkpoints.flatMap((checkpoint) =>
      windowRows.map((w) => {
        const match = submissionsForStation.find(
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
