/**
 * Fake GPS / GPS Spoofing Detection Library
 * ============================================
 * Multi-layer anti-spoofing system for QR Patrol & Geofencing.
 *
 * Detection layers:
 * 1. Low accuracy signal → real GPS typically has 10-50m accuracy; mock GPS often reports ≤ 1m
 * 2. Unrealistic movement speed between readings → >180 km/h is suspicious
 * 3. Impossible altitude (mock GPS often reports 0 or exactly sea level)
 * 4. Identical coordinates across multiple reads (spoofed positions are perfectly static)
 * 5. Network IP triangulation cross-check via ipinfo API
 * 6. Browser navigator API mock detection
 * 7. Multiple readings consistency check (real GPS jitters slightly; mocked GPS is perfectly stable)
 */

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number;       // metres
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;   // m/s
  heading: number | null;
  timestamp: number;
}

export interface SpoofResult {
  isSpoofed: boolean;
  confidence: number;          // 0-100, higher = more suspicious
  reasons: string[];
  reading: GpsReading;
  ipCity?: string;
  ipRegion?: string;
  ipLat?: number;
  ipLng?: number;
  ipDistanceKm?: number;
}

// ── Store a small sliding window of recent readings in memory ─────────────────
const READING_HISTORY: GpsReading[] = [];
const HISTORY_MAX = 5;

function addToHistory(r: GpsReading) {
  READING_HISTORY.push(r);
  if (READING_HISTORY.length > HISTORY_MAX) READING_HISTORY.shift();
}

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Layer 1: Accuracy check ───────────────────────────────────────────────────
function checkAccuracy(r: GpsReading): { flag: boolean; reason: string } | null {
  // Real GPS: 5–50m accuracy for high-accuracy mode
  // Mock/spoofed GPS apps often return 0–2m (too perfect) or >1000m (no real GPS)
  if (r.accuracy < 2) {
    return { flag: true, reason: `Suspiciously perfect accuracy: ${r.accuracy.toFixed(1)}m (real GPS is typically 5–50m)` };
  }
  return null;
}

// ── Layer 2: Movement speed check ────────────────────────────────────────────
function checkSpeed(r: GpsReading): { flag: boolean; reason: string } | null {
  if (READING_HISTORY.length < 1) return null;
  const prev = READING_HISTORY[READING_HISTORY.length - 1];
  const distKm = haversineKm(prev.latitude, prev.longitude, r.latitude, r.longitude);
  const timeSec = (r.timestamp - prev.timestamp) / 1000;
  if (timeSec < 0.5) return null; // too close in time
  const speedKmh = (distKm / timeSec) * 3600;
  // 180 km/h = speed of a fast train; anything faster on foot is impossible
  if (speedKmh > 180) {
    return {
      flag: true,
      reason: `Impossible movement speed: ${Math.round(speedKmh)} km/h between readings`,
    };
  }
  return null;
}

// ── Layer 3: Altitude check ───────────────────────────────────────────────────
function checkAltitude(r: GpsReading): { flag: boolean; reason: string } | null {
  // Many spoofing apps report altitude = 0 exactly
  if (r.altitude !== null && r.altitude === 0 && r.altitudeAccuracy === 0) {
    return { flag: true, reason: 'Altitude is exactly 0 with 0 accuracy — common with mock GPS apps' };
  }
  return null;
}

// ── Layer 4: Stability check (spoofed coords are perfectly static) ────────────
function checkStability(r: GpsReading): { flag: boolean; reason: string } | null {
  if (READING_HISTORY.length < 3) return null;
  const recentThree = READING_HISTORY.slice(-3);
  const allSameLat = recentThree.every(h => h.latitude === r.latitude);
  const allSameLng = recentThree.every(h => h.longitude === r.longitude);
  if (allSameLat && allSameLng) {
    return { flag: true, reason: 'GPS coordinates are perfectly identical across multiple readings — real GPS always jitters slightly' };
  }
  return null;
}

// ── Layer 5: Browser mock detection ──────────────────────────────────────────
function checkBrowserMock(): { flag: boolean; reason: string } | null {
  if (typeof navigator === 'undefined') return null;
  // Check for common mock GPS browser extensions that override navigator.geolocation
  const geo = navigator.geolocation;
  if (!geo) return null;

  try {
    // Native geolocation's getCurrentPosition has no prototype-level custom properties
    const posProto = Object.getOwnPropertyNames(geo);
    // If the prototype has been mocked it often has extra non-standard properties
    const native = ['getCurrentPosition', 'watchPosition', 'clearWatch'];
    const extras = posProto.filter(k => !native.includes(k));
    if (extras.length > 0) {
      return { flag: true, reason: `Browser Geolocation API may be overridden by an extension (extra properties: ${extras.join(', ')})` };
    }
  } catch {
    // If we can't inspect, that's also suspicious
  }
  return null;
}

// ── IP triangulation check ────────────────────────────────────────────────────
async function checkIPLocation(r: GpsReading): Promise<{
  ipCity?: string; ipRegion?: string; ipLat?: number; ipLng?: number; ipDistanceKm?: number;
  flag: boolean; reason?: string;
}> {
  try {
    const res = await fetch('https://ipinfo.io/json?token=', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { flag: false };
    const data = await res.json();
    if (!data.loc) return { flag: false };
    const [ipLat, ipLng] = data.loc.split(',').map(Number);
    const distKm = haversineKm(r.latitude, r.longitude, ipLat, ipLng);

    return {
      ipCity: data.city,
      ipRegion: data.region,
      ipLat,
      ipLng,
      ipDistanceKm: distKm,
      // If GPS location is > 100km from IP location, it's suspicious
      // (Not conclusive alone — VPNs can shift this)
      flag: distKm > 500,
      reason: distKm > 500
        ? `GPS location is ${Math.round(distKm)} km from your IP's location (${data.city}, ${data.region})`
        : undefined,
    };
  } catch {
    return { flag: false };
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────
/**
 * Take multiple GPS readings and run all spoof-detection layers.
 * Returns a SpoofResult with confidence score and reasons.
 */
export async function detectSpoofing(position: GeolocationPosition): Promise<SpoofResult> {
  const r: GpsReading = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    altitudeAccuracy: position.coords.altitudeAccuracy,
    speed: position.coords.speed,
    heading: position.coords.heading,
    timestamp: position.timestamp,
  };

  const flags: string[] = [];
  let confidence = 0;

  const l1 = checkAccuracy(r);
  if (l1?.flag) { flags.push(l1.reason); confidence += 35; }

  const l2 = checkSpeed(r);
  if (l2?.flag) { flags.push(l2.reason); confidence += 40; }

  const l3 = checkAltitude(r);
  if (l3?.flag) { flags.push(l3.reason); confidence += 20; }

  const l4 = checkStability(r);
  if (l4?.flag) { flags.push(l4.reason); confidence += 30; }

  const l5 = checkBrowserMock();
  if (l5?.flag) { flags.push(l5.reason); confidence += 25; }

  // Add to history after checks so history doesn't include this reading yet
  addToHistory(r);

  // Layer 5: IP check (async, don't block UX too long)
  const ipResult = await checkIPLocation(r);
  if (ipResult.flag && ipResult.reason) {
    flags.push(ipResult.reason);
    confidence += 20;
  }

  const capped = Math.min(100, confidence);

  return {
    isSpoofed: capped >= 50,
    confidence: capped,
    reasons: flags,
    reading: r,
    ipCity: ipResult.ipCity,
    ipRegion: ipResult.ipRegion,
    ipLat: ipResult.ipLat,
    ipLng: ipResult.ipLng,
    ipDistanceKm: ipResult.ipDistanceKm,
  };
}

/**
 * Acquire multiple GPS samples over a short period, then run spoof detection.
 * More robust than a single reading.
 */
export function acquireGPSWithSpoofCheck(
  onSuccess: (pos: GeolocationPosition, spoofResult: SpoofResult) => void,
  onError: (err: GeolocationPositionError | Error) => void,
  options?: PositionOptions,
) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation not supported by this browser'));
    return;
  }

  let readingCount = 0;
  const MAX_READINGS = 3;
  const readings: GpsReading[] = [];
  let watchId: number | null = null;

  const done = async (finalPos: GeolocationPosition) => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    const spoofResult = await detectSpoofing(finalPos);
    onSuccess(finalPos, spoofResult);
  };

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      readingCount++;
      readings.push({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      });
      if (readingCount >= MAX_READINGS) {
        await done(pos);
      }
    },
    (err) => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      onError(err);
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0, ...options },
  );
}

export function clearSpoofHistory() {
  READING_HISTORY.length = 0;
}
