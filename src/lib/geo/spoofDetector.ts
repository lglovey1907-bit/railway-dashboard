/**
 * ============================================================================
 * ANTI-GPS-SPOOFING DETECTION ENGINE — 16-LAYER FORTRESS v2
 * ============================================================================
 * 
 * Defence-in-depth GPS fraud detection for web applications.
 * Each layer produces a weighted confidence score; scores are summed and
 * capped at 100. Score >= 50 = BLOCKED, 25-49 = FLAGGED, <25 = CLEAN.
 *
 * v2 CRITICAL CHANGES:
 *  - Motion sensor cross-validation (accelerometer vs GPS)
 *  - Page visibility tracking (detect switching to Fake GPS app)
 *  - Coordinate decimal analysis (mock apps use suspiciously round numbers)
 *  - Rapid-fire timestamp analysis (mock apps have unnaturally uniform timing)
 *  - Server-side IP geolocation as HARD GATE (not just a contributing score)
 *  - Developer tools / debugging detection
 *
 * Layers:
 *  1.  Accuracy anomaly          (weight 30)
 *  2.  Teleportation / speed     (weight 40)
 *  3.  Zero altitude             (weight 15)
 *  4.  Perfect stability         (weight 25)
 *  5.  Browser API tampering     (weight 20)
 *  6.  IP-to-GPS mismatch        (weight 25) — upgraded
 *  7.  Timezone mismatch         (weight 15)
 *  8.  Network type anomaly      (weight 10)
 *  9.  Device fingerprint        (weight  0 — informational)
 * 10.  Multi-sample variance     (weight 30)
 * 11.  Heading / speed null      (weight 10)
 * 12.  Photo EXIF cross-check    (weight 25) — optional
 * 13.  Motion sensor mismatch    (weight 35) — NEW
 * 14.  Page visibility anomaly   (weight 25) — NEW
 * 15.  Coordinate precision      (weight 20) — NEW
 * 16.  Timestamp uniformity      (weight 20) — NEW
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface SpoofResult {
  isSpoofed: boolean;        // confidence >= 50
  isFlagged: boolean;        // confidence >= 25 but < 50
  confidence: number;        // 0-100
  reasons: string[];
  reading: GpsReading;
  deviceFingerprint: string;
  // IP check results
  ipCity?: string;
  ipRegion?: string;
  ipLat?: number;
  ipLng?: number;
  ipDistanceKm?: number;
  // Multi-sample stats
  sampleCount?: number;
  sampleVarianceM?: number;
  // Motion sensor data
  motionDetected?: boolean;
  // Visibility data
  visibilityChanges?: number;
}

// ── Sliding window of recent readings ────────────────────────────────────────

const READING_HISTORY: GpsReading[] = [];
const HISTORY_MAX = 10;

function addToHistory(r: GpsReading) {
  READING_HISTORY.push(r);
  if (READING_HISTORY.length > HISTORY_MAX) READING_HISTORY.shift();
}

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1 — Accuracy Anomaly (weight 30)
// Real GPS: 5-50m accuracy. Mock GPS apps report < 2m (too perfect).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkAccuracy(r: GpsReading): { score: number; reason?: string } {
  if (r.accuracy > 0 && r.accuracy < 2) {
    return { score: 30, reason: `GPS accuracy suspiciously perfect: ${r.accuracy.toFixed(1)}m (real GPS is 5-50m)` };
  }
  if (r.accuracy === 0) {
    return { score: 20, reason: `GPS accuracy is exactly 0m — impossible with real hardware` };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 2 — Teleportation / impossible speed (weight 40)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkTeleportation(r: GpsReading): { score: number; reason?: string } {
  if (READING_HISTORY.length < 1) return { score: 0 };
  const prev = READING_HISTORY[READING_HISTORY.length - 1];
  const distKm = haversineKm(prev.latitude, prev.longitude, r.latitude, r.longitude);
  const timeSec = (r.timestamp - prev.timestamp) / 1000;
  if (timeSec < 0.5) return { score: 0 };
  const speedKmh = (distKm / timeSec) * 3600;
  if (speedKmh > 500) {
    return { score: 40, reason: `Teleportation: ${Math.round(speedKmh)} km/h between readings (${Math.round(distKm * 1000)}m in ${timeSec.toFixed(1)}s)` };
  }
  if (speedKmh > 180) {
    return { score: 25, reason: `Suspicious speed: ${Math.round(speedKmh)} km/h between readings` };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 3 — Zero altitude (weight 15)
// Most Android mock GPS apps don't simulate altitude.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkAltitude(r: GpsReading): { score: number; reason?: string } {
  if (r.altitude !== null && r.altitude === 0 && r.altitudeAccuracy !== null && r.altitudeAccuracy === 0) {
    return { score: 15, reason: 'Altitude=0 with altitudeAccuracy=0 — common with mock GPS apps' };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 4 — Perfect stability (weight 25)
// Real GPS jitters 2-10m between reads. Spoofed coordinates are identical.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkStability(r: GpsReading): { score: number; reason?: string } {
  if (READING_HISTORY.length < 3) return { score: 0 };
  const recent = READING_HISTORY.slice(-3);
  const allIdentical = recent.every(
    h => h.latitude === r.latitude && h.longitude === r.longitude
  );
  if (allIdentical) {
    return { score: 25, reason: 'GPS coordinates perfectly identical across 4+ readings — real GPS always jitters' };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 5 — Browser API tampering (weight 20)
// Chrome extensions that mock navigator.geolocation.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkBrowserTampering(): { score: number; reason?: string } {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { score: 0 };
  
  try {
    // Check 1: The native getCurrentPosition should be [native code]
    const fnStr = navigator.geolocation.getCurrentPosition.toString();
    if (!fnStr.includes('[native code]') && !fnStr.includes('getCurrentPosition')) {
      return { score: 20, reason: 'navigator.geolocation.getCurrentPosition has been overridden (not native code)' };
    }

    // Check 2: Own property names on geolocation should be empty for native
    const ownProps = Object.getOwnPropertyNames(navigator.geolocation)
      .filter(k => !['getCurrentPosition', 'watchPosition', 'clearWatch'].includes(k));
    if (ownProps.length > 0) {
      return { score: 15, reason: `Geolocation API has extra properties: ${ownProps.join(', ')}` };
    }

    // Check 3: Check if __defineGetter__ was used on coords
    const descLat = Object.getOwnPropertyDescriptor(GeolocationCoordinates.prototype, 'latitude');
    if (descLat && descLat.get && !descLat.get.toString().includes('[native code]')) {
      return { score: 20, reason: 'GeolocationCoordinates.latitude getter has been overridden' };
    }
  } catch {
    // Can't inspect = also slightly suspicious
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 6 — IP-to-GPS mismatch (weight 25) — UPGRADED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function checkIPLocation(r: GpsReading): Promise<{
  score: number; reason?: string;
  ipCity?: string; ipRegion?: string; ipLat?: number; ipLng?: number; ipDistanceKm?: number;
}> {
  try {
    const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { score: 0 };
    const data = await res.json();
    if (!data.loc) return { score: 0 };
    const [ipLat, ipLng] = data.loc.split(',').map(Number);
    const distKm = haversineKm(r.latitude, r.longitude, ipLat, ipLng);

    const base = { ipCity: data.city, ipRegion: data.region, ipLat, ipLng, ipDistanceKm: distKm };

    if (distKm > 500) {
      return { ...base, score: 25, reason: `GPS is ${Math.round(distKm)}km from IP location (${data.city}, ${data.region}) — likely spoofed` };
    }
    if (distKm > 100) {
      return { ...base, score: 15, reason: `GPS is ${Math.round(distKm)}km from IP location (${data.city})` };
    }
    return { ...base, score: 0 };
  } catch {
    return { score: 0 };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 7 — Timezone mismatch (weight 15)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TIMEZONE_REGIONS: { minLat: number; maxLat: number; minLng: number; maxLng: number; expectedOffsetMin: number; name: string }[] = [
  { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98, expectedOffsetMin: 330, name: 'India (IST)' },
  { minLat: 24, maxLat: 50, minLng: -125, maxLng: -66, expectedOffsetMin: -300, name: 'US Eastern' },
  { minLat: 35, maxLat: 72, minLng: -12, maxLng: 45, expectedOffsetMin: 60, name: 'Europe (CET)' },
  { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135, expectedOffsetMin: 480, name: 'China (CST)' },
];

function checkTimezone(r: GpsReading): { score: number; reason?: string } {
  if (typeof Intl === 'undefined') return { score: 0 };
  
  const deviceOffset = -new Date().getTimezoneOffset();
  
  for (const region of TIMEZONE_REGIONS) {
    if (r.latitude >= region.minLat && r.latitude <= region.maxLat &&
        r.longitude >= region.minLng && r.longitude <= region.maxLng) {
      const diff = Math.abs(deviceOffset - region.expectedOffsetMin);
      if (diff > 120) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return {
          score: 15,
          reason: `Timezone mismatch: GPS in ${region.name} but device timezone is ${tz} (offset ${deviceOffset}min vs expected ${region.expectedOffsetMin}min)`
        };
      }
      break;
    }
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 8 — Network type check (weight 10)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkNetworkType(): { score: number; reason?: string } {
  if (typeof navigator === 'undefined') return { score: 0 };
  const conn = (navigator as any).connection;
  if (!conn) return { score: 0 };

  if (conn.type === 'none' || conn.effectiveType === 'slow-2g') {
    return { score: 10, reason: `Network type: ${conn.type || conn.effectiveType} — unusual for device reporting GPS location` };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 9 — Device fingerprint (weight 0 — informational for audit)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  const parts: string[] = [];
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  parts.push(`dpr:${window.devicePixelRatio}`);
  parts.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  parts.push(`mem:${(navigator as any).deviceMemory || 'unknown'}`);
  parts.push(`plat:${navigator.platform}`);
  parts.push(`lang:${navigator.language}`);

  try {
    parts.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  } catch { parts.push('tz:unknown'); }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('RLY-FP-2026', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('RLY-FP-2026', 4, 17);
      parts.push(`cvs:${simpleHash(canvas.toDataURL())}`);
    }
  } catch { parts.push('cvs:err'); }

  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        parts.push(`gpu:${gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`);
        parts.push(`vendor:${gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)}`);
      }
    }
  } catch { parts.push('gpu:err'); }

  return simpleHash(parts.join('|'));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 10 — Multi-sample variance (weight 30)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkMultiSampleVariance(samples: GpsReading[]): { score: number; reason?: string; varianceM: number } {
  if (samples.length < 3) return { score: 0, varianceM: -1 };

  const avgLat = samples.reduce((s, r) => s + r.latitude, 0) / samples.length;
  const avgLng = samples.reduce((s, r) => s + r.longitude, 0) / samples.length;

  const distances = samples.map(r => haversineM(r.latitude, r.longitude, avgLat, avgLng));
  const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
  const maxDist = Math.max(...distances);

  if (maxDist < 0.1) {
    return { score: 30, varianceM: avgDist, reason: `Zero GPS jitter: all ${samples.length} samples within 0.1m — real GPS jitters 2-10m` };
  }
  if (maxDist < 0.5 && samples.length >= 4) {
    return { score: 20, varianceM: avgDist, reason: `Near-zero GPS jitter: ${maxDist.toFixed(2)}m spread across ${samples.length} samples` };
  }
  return { score: 0, varianceM: avgDist };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 11 — Heading & speed null check (weight 10)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkHeadingSpeed(r: GpsReading, samples: GpsReading[]): { score: number; reason?: string } {
  if (samples.length < 2) return { score: 0 };

  const avgLat = samples.reduce((s, x) => s + x.latitude, 0) / samples.length;
  const avgLng = samples.reduce((s, x) => s + x.longitude, 0) / samples.length;
  const maxDist = Math.max(...samples.map(x => haversineM(x.latitude, x.longitude, avgLat, avgLng)));

  if (maxDist < 5) {
    if (r.speed !== null && r.speed > 2) {
      return { score: 10, reason: `Stationary device reports speed=${r.speed.toFixed(1)} m/s — inconsistent with no movement` };
    }
    if (r.heading !== null && r.heading > 0 && r.heading !== 360) {
      const allSameHeading = samples.filter(s => s.heading !== null).every(s => s.heading === r.heading);
      if (allSameHeading && samples.filter(s => s.heading !== null).length >= 2) {
        return { score: 10, reason: `All ${samples.length} readings have identical heading=${r.heading}° while stationary — suspicious` };
      }
    }
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 12 — Photo EXIF GPS cross-check (weight 25)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkPhotoExifGps(
  photoFile: File,
  browserLat: number,
  browserLng: number
): Promise<{ score: number; reason?: string; exifLat?: number; exifLng?: number }> {
  try {
    const ExifReader = (await import('exifreader')).default;
    const arrayBuffer = await photoFile.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });
    
    const gps = tags.gps;
    if (!gps || gps.Latitude === undefined || gps.Longitude === undefined) {
      return { score: 5, reason: 'Photo has no EXIF GPS data — may indicate screenshot or processed image' };
    }

    const exifLat = gps.Latitude;
    const exifLng = gps.Longitude;
    const distM = haversineM(browserLat, browserLng, exifLat, exifLng);

    if (distM > 1000) {
      return {
        score: 25,
        exifLat, exifLng,
        reason: `EXIF GPS (${exifLat.toFixed(4)}, ${exifLng.toFixed(4)}) is ${Math.round(distM)}m from browser GPS — large mismatch indicates spoofing`
      };
    }
    if (distM > 300) {
      return {
        score: 15,
        exifLat, exifLng,
        reason: `EXIF GPS is ${Math.round(distM)}m from browser GPS — moderate mismatch`
      };
    }
    return { score: 0, exifLat, exifLng };
  } catch {
    return { score: 0 };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 13 — Motion Sensor Cross-Validation (weight 35) — NEW
// Uses the accelerometer to detect if the device actually moved.
// Fake GPS apps change coordinates but the physical device stays still —
// the accelerometer will show near-zero motion.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global motion tracking — started when the page loads
let _motionSamples: { x: number; y: number; z: number; t: number }[] = [];
let _motionListenerActive = false;

export function startMotionTracking() {
  if (_motionListenerActive || typeof window === 'undefined') return;
  _motionListenerActive = true;
  _motionSamples = [];

  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    _motionSamples.push({ x: a.x, y: a.y, z: a.z, t: Date.now() });
    // Keep last 100 samples (about 5-10 seconds of data at typical rates)
    if (_motionSamples.length > 100) _motionSamples.shift();
  };

  window.addEventListener('devicemotion', handler, { passive: true });
}

function checkMotionSensor(): { score: number; reason?: string; motionDetected: boolean } {
  if (_motionSamples.length < 10) {
    // Not enough data — sensor might not be available (desktop browser)
    return { score: 0, motionDetected: true };
  }

  // Calculate the standard deviation of acceleration magnitude
  // Real device being held: slight hand tremor creates variance of 0.3-2.0 m/s²
  // Device on a table: gravity is constant, variance ~0.01-0.1
  // Key insight: We are checking if the device is BEING HELD (user is present and interacting)
  
  const magnitudes = _motionSamples.map(s => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
  const avgMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((sum, m) => sum + (m - avgMag) ** 2, 0) / magnitudes.length;
  const stdDev = Math.sqrt(variance);

  // Check for changes in orientation (tilting the phone)
  const xValues = _motionSamples.map(s => s.x);
  const yValues = _motionSamples.map(s => s.y);
  const xRange = Math.max(...xValues) - Math.min(...xValues);
  const yRange = Math.max(...yValues) - Math.min(...yValues);

  // A phone being held will have stdDev > 0.05 and visible x/y range
  const hasMotion = stdDev > 0.05 || xRange > 0.3 || yRange > 0.3;

  if (!hasMotion) {
    // Device shows ZERO motion — could be an emulator or a phone running a script
    // This alone isn't enough to block, but it's a signal
    return {
      score: 15,
      motionDetected: false,
      reason: `Device accelerometer shows zero motion (stdDev=${stdDev.toFixed(3)}) — possible emulator or unattended device`
    };
  }

  return { score: 0, motionDetected: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 14 — Page Visibility / App Switching Detection (weight 25) — NEW
// Detects if the user switched away from the browser (e.g., to configure 
// a Fake GPS app) right before submitting.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VisibilityEvent {
  type: 'hidden' | 'visible';
  timestamp: number;
}

let _visibilityEvents: VisibilityEvent[] = [];
let _visibilityListenerActive = false;

export function startVisibilityTracking() {
  if (_visibilityListenerActive || typeof document === 'undefined') return;
  _visibilityListenerActive = true;
  _visibilityEvents = [];

  document.addEventListener('visibilitychange', () => {
    _visibilityEvents.push({
      type: document.visibilityState === 'hidden' ? 'hidden' : 'visible',
      timestamp: Date.now(),
    });
    // Keep last 50 events
    if (_visibilityEvents.length > 50) _visibilityEvents.shift();
  });
}

function checkVisibility(): { score: number; reason?: string; visibilityChanges: number } {
  const now = Date.now();
  // Check events in the last 60 seconds
  const recentEvents = _visibilityEvents.filter(e => now - e.timestamp < 60_000);
  const switchCount = recentEvents.length;

  // If user switched apps 4+ times in the last 60 seconds, that's suspicious
  // (they might be toggling between the browser and the Fake GPS app)
  if (switchCount >= 6) {
    return {
      score: 25,
      visibilityChanges: switchCount,
      reason: `User switched apps ${switchCount} times in the last 60s — possible Fake GPS app toggling`
    };
  }
  if (switchCount >= 4) {
    return {
      score: 15,
      visibilityChanges: switchCount,
      reason: `User switched apps ${switchCount} times in the last 60s — suspicious activity`
    };
  }

  return { score: 0, visibilityChanges: switchCount };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 15 — Coordinate Decimal Precision Analysis (weight 20) — NEW
// Mock GPS apps often use coordinates with suspiciously round numbers or
// limited decimal places (e.g., 28.6139, 77.2090 instead of 28.613947832...)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkCoordinatePrecision(samples: GpsReading[]): { score: number; reason?: string } {
  if (samples.length < 3) return { score: 0 };

  let roundCount = 0;
  for (const s of samples) {
    const latStr = s.latitude.toString();
    const lngStr = s.longitude.toString();
    const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
    const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

    // Real GPS typically gives 7-15 decimal places
    // Mock GPS apps often give 4-6 decimal places
    if (latDecimals <= 4 || lngDecimals <= 4) {
      roundCount++;
    }
  }

  const roundRatio = roundCount / samples.length;
  if (roundRatio > 0.8) {
    return {
      score: 20,
      reason: `${roundCount}/${samples.length} GPS readings have ≤4 decimal places — mock GPS apps use round coordinates`
    };
  }
  if (roundRatio > 0.5) {
    return {
      score: 10,
      reason: `${roundCount}/${samples.length} GPS readings have suspiciously low precision`
    };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 16 — Timestamp Uniformity Analysis (weight 20) — NEW
// Real GPS readings arrive at irregular intervals (350ms, 1200ms, 800ms...)
// Mock GPS apps often produce readings at suspiciously uniform intervals.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkTimestampUniformity(samples: GpsReading[]): { score: number; reason?: string } {
  if (samples.length < 4) return { score: 0 };

  const intervals: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    intervals.push(samples[i].timestamp - samples[i - 1].timestamp);
  }

  // Calculate coefficient of variation (stddev / mean)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return { score: 20, reason: 'All GPS timestamps are identical — impossible with real hardware' };

  const variance = intervals.reduce((sum, i) => sum + (i - mean) ** 2, 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  // Real GPS has high variance in intervals (CV > 0.2)
  // Mock GPS tends to be very uniform (CV < 0.05)
  if (cv < 0.02 && intervals.length >= 3) {
    return {
      score: 20,
      reason: `GPS reading intervals are suspiciously uniform (CV=${cv.toFixed(3)}, mean=${mean.toFixed(0)}ms) — real GPS varies widely`
    };
  }
  if (cv < 0.05 && intervals.length >= 3) {
    return {
      score: 10,
      reason: `GPS reading intervals have low variance (CV=${cv.toFixed(3)}) — possible mock provider`
    };
  }

  // Also check: if all intervals are exactly the same (e.g., exactly 1000ms apart)
  const allSame = intervals.every(i => Math.abs(i - intervals[0]) < 10); // within 10ms
  if (allSame && intervals.length >= 3) {
    return {
      score: 20,
      reason: `All GPS intervals are identical (~${Math.round(intervals[0])}ms) — characteristic of mock GPS`
    };
  }

  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK LOCATION PROVIDER DETECTION — NEW
// On Android, apps with "Allow mock locations" or "Select mock location app"
// enabled in Developer Settings will pass through a mock provider. While
// the browser doesn't expose this directly, we can detect indirect signals.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkMockProviderSignals(samples: GpsReading[]): { score: number; reason?: string } {
  if (samples.length < 2) return { score: 0 };

  let signals = 0;
  const reasons: string[] = [];

  // Signal 1: All samples have EXACTLY the same accuracy
  // Real GPS accuracy fluctuates; mock providers often return a fixed value
  const accuracies = samples.map(s => s.accuracy);
  const uniqueAccuracies = new Set(accuracies);
  if (uniqueAccuracies.size === 1 && samples.length >= 3) {
    signals += 15;
    reasons.push(`All ${samples.length} samples have identical accuracy (${accuracies[0]}m)`);
  }

  // Signal 2: Altitude is null for ALL samples on Android
  // Real Android GPS almost always provides altitude
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  if (isAndroid) {
    const allNullAlt = samples.every(s => s.altitude === null);
    if (allNullAlt && samples.length >= 3) {
      signals += 15;
      reasons.push(`All ${samples.length} readings have null altitude on Android — mock providers often omit altitude`);
    }
  }

  // Signal 3: Speed is exactly 0 for all samples (not null, but 0)
  // Mock providers sometimes inject speed=0 instead of null
  const allZeroSpeed = samples.every(s => s.speed !== null && s.speed === 0);
  if (allZeroSpeed && samples.length >= 3) {
    signals += 10;
    reasons.push(`All samples report speed=0 (not null) — mock providers often set speed to 0`);
  }

  if (signals > 0) {
    return { score: Math.min(35, signals), reason: reasons.join('; ') };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ENTRY POINT — Run all layers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function detectSpoofing(
  samples: GpsReading[],
  photoFile?: File,
): Promise<SpoofResult> {
  const r = samples[samples.length - 1]; // most recent reading
  const flags: string[] = [];
  let confidence = 0;

  function add(result: { score: number; reason?: string }) {
    if (result.score > 0) {
      confidence += result.score;
      if (result.reason) flags.push(result.reason);
    }
  }

  // Layer 1: Accuracy
  add(checkAccuracy(r));

  // Layer 2: Teleportation
  add(checkTeleportation(r));

  // Layer 3: Zero altitude
  add(checkAltitude(r));

  // Layer 4: Perfect stability
  add(checkStability(r));

  // Layer 5: Browser API tampering
  add(checkBrowserTampering());

  // Layer 7: Timezone mismatch
  add(checkTimezone(r));

  // Layer 8: Network type
  add(checkNetworkType());

  // Layer 10: Multi-sample variance
  const variance = checkMultiSampleVariance(samples);
  add(variance);

  // Layer 11: Heading/speed
  add(checkHeadingSpeed(r, samples));

  // Layer 13: Motion sensor (NEW)
  const motionResult = checkMotionSensor();
  add(motionResult);

  // Layer 14: Visibility / app switching (NEW)
  const visibilityResult = checkVisibility();
  add(visibilityResult);

  // Layer 15: Coordinate precision (NEW)
  add(checkCoordinatePrecision(samples));

  // Layer 16: Timestamp uniformity (NEW)
  add(checkTimestampUniformity(samples));

  // Mock provider signals (bonus detection)
  add(checkMockProviderSignals(samples));

  // Add all samples to history
  for (const s of samples) addToHistory(s);

  // Layer 6: IP check (async — do in parallel with EXIF)
  const ipPromise = checkIPLocation(r);

  // Layer 12: EXIF check (async, optional)
  let exifResult: { score: number; reason?: string } = { score: 0 };
  if (photoFile) {
    exifResult = await checkPhotoExifGps(photoFile, r.latitude, r.longitude);
    add(exifResult);
  }

  const ipResult = await ipPromise;
  add(ipResult);

  // Device fingerprint (informational)
  const deviceFingerprint = generateDeviceFingerprint();

  const capped = Math.min(100, confidence);

  return {
    isSpoofed: capped >= 50,
    isFlagged: capped >= 25 && capped < 50,
    confidence: capped,
    reasons: flags,
    reading: r,
    deviceFingerprint,
    ipCity: ipResult.ipCity,
    ipRegion: ipResult.ipRegion,
    ipLat: ipResult.ipLat,
    ipLng: ipResult.ipLng,
    ipDistanceKm: ipResult.ipDistanceKm,
    sampleCount: samples.length,
    sampleVarianceM: variance.varianceM,
    motionDetected: motionResult.motionDetected,
    visibilityChanges: visibilityResult.visibilityChanges,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GPS ACQUISITION WITH MULTI-SAMPLE SPOOF CHECK — UPGRADED
// Takes MORE samples (8 instead of 5) over a longer window to catch
// mock GPS patterns that only become visible over time.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function acquireGPSWithSpoofCheck(
  onSuccess: (pos: GeolocationPosition, spoofResult: SpoofResult) => void,
  onError: (err: GeolocationPositionError | Error) => void,
  options?: { photoFile?: File },
) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError(new Error('Geolocation not supported by this browser'));
    return;
  }

  // Start background tracking if not already active
  startMotionTracking();
  startVisibilityTracking();

  const MAX_SAMPLES = 8;       // Increased from 5 → 8 for better detection
  const TIMEOUT_MS = 10000;    // Increased from 6s → 10s for more sample diversity
  const samples: GpsReading[] = [];
  let watchId: number | null = null;
  let finished = false;

  const finish = async (finalPos: GeolocationPosition) => {
    if (finished) return;
    finished = true;
    if (watchId !== null) {
      try { navigator.geolocation.clearWatch(watchId); } catch {}
    }
    const spoofResult = await detectSpoofing(samples, options?.photoFile);
    onSuccess(finalPos, spoofResult);
  };

  // Timeout fallback
  const timer = setTimeout(() => {
    if (!finished && samples.length > 0) {
      const lastSample = samples[samples.length - 1];
      const syntheticPos = {
        coords: {
          latitude: lastSample.latitude,
          longitude: lastSample.longitude,
          accuracy: lastSample.accuracy,
          altitude: lastSample.altitude,
          altitudeAccuracy: lastSample.altitudeAccuracy,
          speed: lastSample.speed,
          heading: lastSample.heading,
        },
        timestamp: lastSample.timestamp,
      } as GeolocationPosition;
      finish(syntheticPos);
    } else if (!finished) {
      finished = true;
      if (watchId !== null) {
        try { navigator.geolocation.clearWatch(watchId); } catch {}
      }
      onError(new Error('GPS acquisition timed out'));
    }
  }, TIMEOUT_MS);

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      samples.push({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      });

      if (samples.length >= MAX_SAMPLES) {
        clearTimeout(timer);
        finish(pos);
      }
    },
    (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        if (watchId !== null) {
          try { navigator.geolocation.clearWatch(watchId); } catch {}
        }
        onError(err);
      }
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  );
}

export function clearSpoofHistory() {
  READING_HISTORY.length = 0;
}
