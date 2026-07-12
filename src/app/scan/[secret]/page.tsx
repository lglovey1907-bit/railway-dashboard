import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import ScanForm from "@/components/ScanForm";

export const dynamic = 'force-dynamic';

export default async function ScanPage({ params }: { params: { secret: string } }) {
  const { rows } = await sql`
    SELECT p.id, p.label, p.secret_token, s.name as station_name, s.latitude, s.longitude 
    FROM qr_points p
    JOIN stations s ON s.id = p.station_id
    WHERE p.secret_token = ${params.secret}
  `;

  const point = rows[0];

  if (!point) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid QR Code</h1>
          <p className="text-slate-500 mb-6">This QR code is not recognized or has been deleted.</p>
        </div>
      </div>
    );
  }

  return <ScanForm secret={point.secret_token} label={point.label} station={point.station_name} stationLat={point.latitude} stationLng={point.longitude} />;
}
