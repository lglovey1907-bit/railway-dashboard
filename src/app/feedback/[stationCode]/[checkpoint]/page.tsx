import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import FeedbackForm from "@/components/FeedbackForm";

export default async function FeedbackPage({ params }: { params: { stationCode: string, checkpoint: string } }) {
  const code = decodeURIComponent(params.stationCode).toUpperCase();
  const checkpoint = decodeURIComponent(params.checkpoint);
  
  const { rows } = await sql`SELECT id, name, latitude, longitude FROM stations WHERE code = ${code}`;
  
  if (rows.length === 0) {
    notFound();
  }

  const station = rows[0];

  // Try to find precise coordinates for this specific checkpoint label
  const { rows: pointRows } = await sql`
    SELECT latitude, longitude FROM qr_points 
    WHERE station_id = ${station.id} AND label = ${checkpoint}
  `;

  const point = pointRows[0];
  const targetLat = point?.latitude || station.latitude;
  const targetLng = point?.longitude || station.longitude;

  return (
    <FeedbackForm 
      stationId={station.id}
      stationCode={code} 
      stationName={station.name} 
      checkpointLabel={checkpoint}
      stationLat={targetLat} 
      stationLng={targetLng} 
    />
  );
}
