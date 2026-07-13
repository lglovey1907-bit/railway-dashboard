/**
 * ============================================================================
 * ANTI-GPS-SPOOFING DETECTION ENGINE — 12-LAYER FORTRESS
 * ============================================================================
 * 
 * Defence-in-depth GPS fraud detection for web applications.
 * Each layer produces a weighted confidence score; scores are summed and
 * capped at 100. Score >= 50 = BLOCKED, 25-49 = FLAGGED, <25 = CLEAN.
 *
 * Layers:
 *  1.  Accuracy anomaly          (weight 30)
 *  2.  Teleportation / speed     (weight 40)
 *  3.  Zero altitude             (weight 15)
 *  4.  Perfect stability         (weight 25)
 *  5.  Browser API tampering     (weight 20)
 *  6.  IP-to-GPS mismatch        (weight 20)
 *  7.  Timezone mismatch         (weight 15)
 *  8.  Network type anomaly      (weight 10)
 *  9.  Device fingerprint        (weight  0 — informational, stored for audit)
 * 10.  Multi-sample variance     (weight 30)
 * 11.  Heading / speed null      (weight 10)
 * 12.  Photo EXIF cross-check    (weight 25)  — optional, called separately
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
// LAYER 6 — IP-to-GPS mismatch (weight 20)
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
      return { ...base, score: 20, reason: `GPS is ${Math.round(distKm)}km from IP location (${data.city}, ${data.region})` };
    }
    if (distKm > 100) {
      return { ...base, score: 10, reason: `GPS is ${Math.round(distKm)}km from IP location (${data.city})` };
    }
    return { ...base, score: 0 };
  } catch {
    return { score: 0 };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 7 — Timezone mismatch (weight 15)
// GPS says India (IST = +5:30) but browser timezone is UTC or US/Pacific?
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Rough mapping: lat/lng bounding boxes → expected timezone offset (in minutes)
const TIMEZONE_REGIONS: { minLat: number; maxLat: number; minLng: number; maxLng: number; expectedOffsetMin: number; name: string }[] = [
  { minLat: 6, maxLat: 36, minLng: 68, maxLng: 98, expectedOffsetMin: 330, name: 'India (IST)' },
  { minLat: 24, maxLat: 50, minLng: -125, maxLng: -66, expectedOffsetMin: -300, name: 'US Eastern' },
  { minLat: 35, maxLat: 72, minLng: -12, maxLng: 45, expectedOffsetMin: 60, name: 'Europe (CET)' },
  { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135, expectedOffsetMin: 480, name: 'China (CST)' },
];

function checkTimezone(r: GpsReading): { score: number; reason?: string } {
  if (typeof Intl === 'undefined') return { score: 0 };
  
  const deviceOffset = -new Date().getTimezoneOffset(); // minutes from UTC
  
  for (const region of TIMEZONE_REGIONS) {
    if (r.latitude >= region.minLat && r.latitude <= region.maxLat &&
        r.longitude >= region.minLng && r.longitude <= region.maxLng) {
      const diff = Math.abs(deviceOffset - region.expectedOffsetMin);
      if (diff > 120) { // More than 2 hours off
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
// If navigator.connection reports 'none' but GPS works → suspicious
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkNetworkType(): { score: number; reason?: string } {
  if (typeof navigator === 'undefined') return { score: 0 };
  const conn = (navigator as any).connection;
  if (!conn) return { score: 0 }; // API not supported (Safari/Firefox)

  // If browser reports no connection but GPS somehow works
  if (conn.type === 'none' || conn.effectiveType === 'slow-2g') {
    return { score: 10, reason: `Network type: ${conn.type || conn.effectiveType} — unusual for device reporting GPS location` };
  }
  return { score: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 9 — Device fingerprint (weight 0 — informational for audit)
// Canvas + WebGL + screen + hardware → stable hash for audit trail.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  const parts: string[] = [];

  // Screen
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  parts.push(`dpr:${window.devicePixelRatio}`);

  // Hardware
  parts.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  parts.push(`mem:${(navigator as any).deviceMemory || 'unknown'}`);

  // Platform + language
  parts.push(`plat:${navigator.platform}`);
  parts.push(`lang:${navigator.language}`);

  // Timezone
  try {
    parts.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  } catch { parts.push('tz:unknown'); }

  // Canvas fingerprint (renders text and shapes, hashes the pixel output)
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

  // WebGL renderer
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
// Take N GPS reads; measure coordinate variance. Real GPS jitters 2-10m.
// Spoofed GPS returns identical coordinates.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkMultiSampleVariance(samples: GpsReading[]): { score: number; reason?: string; varianceM: number } {
  if (samples.length < 3) return { score: 0, varianceM: -1 };

  const avgLat = samples.reduce((s, r) => s + r.latitude, 0) / samples.length;
  const avgLng = samples.reduce((s, r) => s + r.longitude, 0) / samples.length;

  // Calculate average distance from centroid in metres
  const distances = samples.map(r => haversineM(r.latitude, r.longitude, avgLat, avgLng));
  const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
  const maxDist = Math.max(...distances);

  // All readings within 0.1m of each other → very suspicious (zero jitter)
  if (maxDist < 0.1) {
    return { score: 30, varianceM: avgDist, reason: `Zero GPS jitter: all ${samples.length} samples within 0.1m — real GPS jitters 2-10m` };
  }
  // Very low jitter
  if (maxDist < 0.5 && samples.length >= 4) {
    return { score: 20, varianceM: avgDist, reason: `Near-zero GPS jitter: ${maxDist.toFixed(2)}m spread across ${samples.length} samples` };
  }
  return { score: 0, varianceM: avgDist };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 11 — Heading & speed null check (weight 10)
// Stationary real GPS: heading=null, speed=null or ~0.
// Spoofers often inject non-null heading/speed values even when stationary.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkHeadingSpeed(r: GpsReading, samples: GpsReading[]): { score: number; reason?: string } {
  if (samples.length < 2) return { score: 0 };

  // Check if device is "stationary" (all samples within 5m)
  const avgLat = samples.reduce((s, x) => s + x.latitude, 0) / samples.length;
  const avgLng = samples.reduce((s, x) => s + x.longitude, 0) / samples.length;
  const maxDist = Math.max(...samples.map(x => haversineM(x.latitude, x.longitude, avgLat, avgLng)));

  if (maxDist < 5) {
    // Device is stationary. Check if speed/heading are suspiciously set.
    if (r.speed !== null && r.speed > 2) {
      return { score: 10, reason: `Stationary device reports speed=${r.speed.toFixed(1)} m/s — inconsistent with no movement` };
    }
    if (r.heading !== null && r.heading > 0 && r.heading !== 360) {
      // Some spoofers set heading to a fixed bearing
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
// Called externally when a photo File is available.
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
      // No EXIF GPS data — not conclusive by itself, but suspicious if camera should embed GPS
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
    // EXIF parsing failed — not a red flag by itself
    return { score: 0 };
  }
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
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GPS ACQUISITION WITH MULTI-SAMPLE SPOOF CHECK
// Takes N GPS readings over a few seconds, then runs all 12 layers.
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

  const MAX_SAMPLES = 5;
  const TIMEOUT_MS = 6000; // max 6 seconds for all samples
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

  // Timeout fallback — if we don't get enough samples, use what we have
  const timer = setTimeout(() => {
    if (!finished && samples.length > 0) {
      const lastSample = samples[samples.length - 1];
      // Create a synthetic GeolocationPosition from our last sample
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
