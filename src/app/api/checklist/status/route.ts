// app/api/checklist/status/route.ts
// Powers the "today's status" tiles on your dashboard.
// Green  = all checkpoints submitted, on time, on location, AI score >= 6
// Yellow = submitted but flagged (late / off-location / low AI score)
// Red    = missing entirely for a window that has already closed

import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const targetDate = dateParam || new Date().toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastDate = targetDate < todayStr;
  const isFutureDate = targetDate > todayStr;

  // Fetch target date's submissions
  const { rows } = await sql`
    SELECT s.code AS station_code, c.label AS checkpoint, w.label AS window,
           sub.within_geofence, sub.within_window, sub.ai_score, sub.captured_at,
           sub.photo_url, sub.distance_m, sub.submitted_by, sub.ai_notes, sub.ai_scored_at
    FROM submissions sub
    JOIN stations s ON s.id = sub.station_id
    JOIN checkpoints c ON c.id = sub.checkpoint_id
    JOIN windows w ON w.id = sub.window_id
    WHERE sub.captured_at::date = ${targetDate}
  `;

  // Fetch stations and their checkpoints from DB
  const { rows: stationRows } = await sql`
    SELECT s.id, s.code, s.name, c.label AS checkpoint
    FROM stations s
    JOIN checkpoints c ON c.station_id = s.id
    ORDER BY s.code, c.sort_order
  `;

  // Fetch windows from DB
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

        let windowClosed = false;
        if (isPastDate) windowClosed = true;
        else if (isFutureDate) windowClosed = false;
        else windowClosed = isWindowClosedToday(w.end);

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

        let parsedAiNotes = null;
        if (match?.ai_notes) {
          try {
            parsedAiNotes = typeof match.ai_notes === 'string' ? JSON.parse(match.ai_notes) : match.ai_notes;
          } catch(e) {
            parsedAiNotes = match.ai_notes;
          }
        }

        return { 
          checkpoint, 
          window: w.label, 
          status, 
          aiScore: match?.ai_score ?? null,
          photoUrl: match?.photo_url ?? null,
          distance: match?.distance_m ?? null,
          submittedBy: match?.submitted_by ?? null,
          capturedAt: match?.captured_at ?? null,
          aiScoredAt: match?.ai_scored_at ?? null,
          aiNotes: parsedAiNotes
        };
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

function isWindowClosedToday(end: string): boolean {
  const [eh, em] = end.split(":").map(Number);
  const now = new Date();
  const closeTime = new Date();
  closeTime.setHours(eh, em + 15, 0, 0); // 15-min grace
  return now > closeTime;
}
