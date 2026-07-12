import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import FeedbackForm from "@/components/FeedbackForm";

export default async function FeedbackPage({ params }: { params: { stationCode: string } }) {
  const code = decodeURIComponent(params.stationCode).toUpperCase();
  const { rows } = await sql`SELECT id, name, latitude, longitude FROM stations WHERE code = ${code}`;
  
  if (rows.length === 0) {
    notFound();
  }

  const station = rows[0];

  return (
    <FeedbackForm 
      stationId={station.id}
      stationCode={code} 
      stationName={station.name} 
      stationLat={station.latitude} 
      stationLng={station.longitude} 
    />
  );
}
