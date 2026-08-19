// app/checklist/[stationCode]/page.tsx
// Each of your 5 stations gets its own QR code pointing at:
//   https://your-app.vercel.app/checklist/STN1
// Print it and post it at the station's staff duty point.

import { STATIONS, WINDOWS } from "@/lib/stations-config";
import PhotoChecklistForm from "@/components/PhotoChecklistForm";
import { notFound } from "next/navigation";

export default function ChecklistPage({
  params,
}: {
  params: { stationCode: string };
}) {
  const station = STATIONS.find((s) => s.code === params.stationCode);
  if (!station) return notFound();

  return (
    <PhotoChecklistForm
      stationCode={station.code}
      stationName={station.name}
      checkpoints={station.checkpoints}
      windows={WINDOWS}
    />
  );
}
