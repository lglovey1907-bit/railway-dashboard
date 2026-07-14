"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Footprints, CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * Walk Verification Challenge
 * 
 * Asks the user to walk 5 steps, then checks:
 *  1. Accelerometer detected walking motion (step-like oscillations)
 *  2. GPS coordinates shifted by at least 2 meters
 * 
 * If accelerometer shows walking but GPS didn't move → FAKE GPS.
 * If GPS moved AND accelerometer confirms → REAL location.
 */

type WalkResult = {
  passed: boolean;
  gpsDeltaM: number;
  stepsDetected: number;
  accelDetectedMotion: boolean;
  reason: string;
};

type Props = {
  onComplete: (result: WalkResult) => void;
  onSkip?: () => void;
};

export function WalkChallenge({ onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<"ready" | "walking" | "analyzing" | "done">("ready");
  const [countdown, setCountdown] = useState(8); // seconds to walk
  const [result, setResult] = useState<WalkResult | null>(null);
  const [statusText, setStatusText] = useState("Tap 'Start' and walk 5 steps in any direction");

  // Refs for data collection
  const accelSamplesRef = useRef<{ x: number; y: number; z: number; t: number }[]>([]);
  const gpsStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsEndRef = useRef<{ lat: number; lng: number } | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Haversine distance in meters
  const haversineM = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Step detection from accelerometer data
  const detectSteps = (samples: { x: number; y: number; z: number; t: number }[]): number => {
    if (samples.length < 10) return 0;

    // Calculate magnitude of acceleration for each sample
    const magnitudes = samples.map(s => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));

    // Apply simple low-pass filter
    const filtered: number[] = [];
    for (let i = 0; i < magnitudes.length; i++) {
      if (i < 3) {
        filtered.push(magnitudes[i]);
      } else {
        filtered.push((magnitudes[i] + magnitudes[i - 1] + magnitudes[i - 2] + magnitudes[i - 3]) / 4);
      }
    }

    // Find mean
    const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;

    // Count zero-crossings above/below mean (each up-down cycle = ~1 step)
    let crossings = 0;
    let above = filtered[0] > mean;
    for (let i = 1; i < filtered.length; i++) {
      const nowAbove = filtered[i] > mean;
      if (nowAbove !== above) {
        crossings++;
        above = nowAbove;
      }
    }

    // Each step produces roughly 2 crossings (up + down)
    return Math.floor(crossings / 2);
  };

  // Check if accelerometer detected significant motion
  const detectMotion = (samples: { x: number; y: number; z: number; t: number }[]): boolean => {
    if (samples.length < 10) return false;

    const magnitudes = samples.map(s => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance = magnitudes.reduce((sum, m) => sum + (m - mean) ** 2, 0) / magnitudes.length;
    const stdDev = Math.sqrt(variance);

    // Walking produces stdDev > 1.0 m/s² typically
    // Standing still with phone in hand: 0.05-0.3
    return stdDev > 0.5;
  };

  const startChallenge = useCallback(async () => {
    setPhase("walking");
    setStatusText("Walk 5 steps now...");
    accelSamplesRef.current = [];
    gpsStartRef.current = null;
    gpsEndRef.current = null;

    // Request motion permission on iOS
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm !== 'granted') {
          setStatusText("Motion sensor permission denied");
          return;
        }
      } catch {
        // Not iOS or permission already granted
      }
    }

    // Start collecting accelerometer data
    const motionHandler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      accelSamplesRef.current.push({ x: a.x, y: a.y, z: a.z, t: Date.now() });
    };
    motionHandlerRef.current = motionHandler;
    window.addEventListener('devicemotion', motionHandler, { passive: true });

    // Start GPS watch — capture start and continuously update end
    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!gpsStartRef.current) {
          gpsStartRef.current = coord;
        }
        gpsEndRef.current = coord;
      },
      () => { /* ignore GPS errors during walk */ },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    // Countdown timer
    let remaining = 8;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 3) {
        setStatusText("Almost done, keep walking...");
      }
    }, 1000);

    // After 8 seconds, analyze results
    timerRef.current = setTimeout(() => {
      analyzeResults();
    }, 8000);
  }, []);

  const analyzeResults = () => {
    setPhase("analyzing");
    setStatusText("Analyzing your walk...");

    // Stop sensors
    if (motionHandlerRef.current) {
      window.removeEventListener('devicemotion', motionHandlerRef.current);
    }
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }
    if (countdownRef.current) clearInterval(countdownRef.current);

    const samples = accelSamplesRef.current;
    const gpsStart = gpsStartRef.current;
    const gpsEnd = gpsEndRef.current;

    // Calculate GPS delta
    let gpsDeltaM = 0;
    if (gpsStart && gpsEnd) {
      gpsDeltaM = haversineM(gpsStart.lat, gpsStart.lng, gpsEnd.lat, gpsEnd.lng);
    }

    // Detect steps and motion
    const stepsDetected = detectSteps(samples);
    const accelDetectedMotion = detectMotion(samples);

    let passed = true;
    let reason = "";

    if (samples.length < 5) {
      // No accelerometer data — device doesn't support it
      // Fall back to GPS-only check
      if (gpsDeltaM < 1.5) {
        passed = false;
        reason = "GPS did not move during walk test — possible fake GPS";
      } else {
        passed = true;
        reason = `GPS moved ${gpsDeltaM.toFixed(1)}m (no accelerometer available)`;
      }
    } else if (accelDetectedMotion && gpsDeltaM < 1.5) {
      // KEY DETECTION: Accelerometer shows walking but GPS didn't move!
      // This is the smoking gun for Fake GPS
      passed = false;
      reason = `Walking detected by accelerometer (${stepsDetected} steps) but GPS moved only ${gpsDeltaM.toFixed(1)}m — FAKE GPS detected`;
    } else if (accelDetectedMotion && gpsDeltaM >= 1.5) {
      // Both sensors agree — real location
      passed = true;
      reason = `Walk verified: ${stepsDetected} steps detected, GPS moved ${gpsDeltaM.toFixed(1)}m`;
    } else if (!accelDetectedMotion && gpsDeltaM >= 1.5) {
      // GPS moved but no walking detected — possible but suspicious
      // Could be someone moving the fake GPS joystick
      passed = true; // Give benefit of doubt
      reason = `GPS moved ${gpsDeltaM.toFixed(1)}m but low accelerometer activity`;
    } else {
      // No motion at all — user didn't walk
      passed = false;
      reason = "No walking detected — please walk 5 steps as instructed";
    }

    const walkResult: WalkResult = {
      passed,
      gpsDeltaM,
      stepsDetected,
      accelDetectedMotion,
      reason,
    };

    setResult(walkResult);
    setPhase("done");
    setStatusText(reason);

    // Short delay then callback
    setTimeout(() => onComplete(walkResult), 1500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (motionHandlerRef.current) {
        window.removeEventListener('devicemotion', motionHandlerRef.current);
      }
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
      <div className="text-center mb-5">
        <div className={`
          w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-500
          ${phase === "ready" ? "bg-blue-50 text-blue-600" : ""}
          ${phase === "walking" ? "bg-amber-50 text-amber-600 animate-bounce" : ""}
          ${phase === "analyzing" ? "bg-slate-100 text-slate-500" : ""}
          ${phase === "done" && result?.passed ? "bg-green-50 text-green-600" : ""}
          ${phase === "done" && !result?.passed ? "bg-red-50 text-red-600" : ""}
        `}>
          {phase === "done" && result?.passed ? (
            <CheckCircle2 size={32} />
          ) : phase === "done" && !result?.passed ? (
            <XCircle size={32} />
          ) : (
            <Footprints size={32} />
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          {phase === "ready" && "Walk Verification"}
          {phase === "walking" && `Walking... ${countdown}s`}
          {phase === "analyzing" && "Analyzing..."}
          {phase === "done" && result?.passed && "Verified ✓"}
          {phase === "done" && !result?.passed && "Verification Failed"}
        </h3>

        <p className={`text-sm font-medium ${
          phase === "done" && !result?.passed ? "text-red-600" : "text-slate-500"
        }`}>
          {statusText}
        </p>
      </div>

      {/* Walking animation */}
      {phase === "walking" && (
        <div className="mb-5">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((8 - countdown) / 8) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
            <span>Start walking</span>
            <span>{countdown}s remaining</span>
          </div>
        </div>
      )}

      {/* Result details */}
      {phase === "done" && result && (
        <div className={`text-xs rounded-lg p-3 mb-4 font-medium ${
          result.passed 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <div className="space-y-1">
            <div>Steps detected: {result.stepsDetected}</div>
            <div>GPS movement: {result.gpsDeltaM.toFixed(1)}m</div>
            <div>Accelerometer: {result.accelDetectedMotion ? "Motion detected ✓" : "No motion ✗"}</div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {phase === "ready" && (
        <button
          onClick={startChallenge}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Footprints size={20} />
          Start Walk Test
        </button>
      )}

      {phase === "walking" && (
        <div className="text-center text-amber-600 font-bold text-sm animate-pulse">
          <Loader2 className="inline animate-spin mr-2" size={16} />
          Recording your movement...
        </div>
      )}

      {phase === "analyzing" && (
        <div className="text-center text-slate-500">
          <Loader2 className="inline animate-spin mr-2" size={16} />
          Processing sensor data...
        </div>
      )}

      {phase === "done" && !result?.passed && (
        <button
          onClick={() => {
            setPhase("ready");
            setResult(null);
            setStatusText("Tap 'Start' and walk 5 steps in any direction");
          }}
          className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-base hover:bg-slate-700 transition-colors mt-2"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
