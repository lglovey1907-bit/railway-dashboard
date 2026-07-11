// app/checklist/[stationCode]/page.tsx
import { sql } from "@vercel/postgres";
import PhotoChecklistForm from "@/components/PhotoChecklistForm";
import AutoLocator from "@/components/AutoLocator";
import { notFound } from "next/navigation";

export default async function ChecklistPage({ params }: { params: { stationCode: string } }) {
  if (params.stationCode.toUpperCase() === 'HOME') {
    return <AutoLocator />;
  }

  const { rows: stationRows } = await sql`SELECT * FROM stations WHERE code = ${params.stationCode}`;
  const station = stationRows[0];
  if (!station) return notFound();

  const { rows: checkpointRows } = await sql`
    SELECT label, latitude, longitude FROM checkpoints WHERE station_id = ${station.id} ORDER BY sort_order
  `;
  const { rows: windowRows } = await sql`SELECT label, start_time, end_time FROM windows`;

  return (
    <PhotoChecklistForm
      stationCode={station.code}
      stationName={station.name}
      checkpoints={checkpointRows.map((c) => ({ label: c.label, lat: c.latitude, lng: c.longitude }))}
      windows={windowRows.map((w) => ({ label: w.label, start: w.start_time, end: w.end_time }))}
    />
  );
}