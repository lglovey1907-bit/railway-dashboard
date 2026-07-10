// lib/geo.ts
// Straight-line distance between two lat/lng points, in metres (Haversine formula).
// Used to reject checklist photos taken away from the actual station.

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Checks whether a captured timestamp falls inside a submission window (e.g. 08:00-09:00),
// with a small grace period for slow uploads.
export function withinWindow(
  capturedAt: Date,
  windowStart: string, // '08:00'
  windowEnd: string, // '09:00'
  graceMinutes = 15
): boolean {
  const [sh, sm] = windowStart.split(":").map(Number);
  const [eh, em] = windowEnd.split(":").map(Number);

  const start = new Date(capturedAt);
  start.setHours(sh, sm - graceMinutes, 0, 0);

  const end = new Date(capturedAt);
  end.setHours(eh, em + graceMinutes, 0, 0);

  return capturedAt >= start && capturedAt <= end;
}
