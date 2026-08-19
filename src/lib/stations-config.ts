// lib/stations-config.ts
// Static config for your 5 stations. Move to DB once the pilot works —
// keeping it in code first makes the MVP faster to ship.

export type Station = {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceMeters: number;
  checkpoints: string[];
};

// Replace lat/lng with the real coordinates of each station building
// (Google Maps → right-click the exact spot → copy the two numbers).
export const STATIONS: Station[] = [
  {
    code: "STN1",
    name: "Station 1 — replace with real name",
    latitude: 28.6448,
    longitude: 77.2167,
    geofenceMeters: 200,
    checkpoints: [
      "Platform 1 surface",
      "Men's toilet",
      "Women's toilet",
      "Waiting room",
      "Drinking water point",
      "FOB / subway",
    ],
  },
  // Add the remaining 4 stations the same way.
];

export const WINDOWS = [
  { label: "Morning", start: "08:00", end: "09:00" },
  { label: "Evening", start: "16:00", end: "17:00" },
];
