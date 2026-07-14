"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

export function LiveSelfieCamera({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceStatus, setFaceStatus] = useState<"no_face" | "align" | "steady" | "capturing">("no_face");
  
  const detectorRef = useRef<FaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const steadyStartTimeRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  const faceStatusRef = useRef<"no_face" | "align" | "steady" | "capturing">("no_face");

  // Initialize camera and model
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        // 1. Get Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user", // Force front camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 2. Load FaceDetector model
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.7,
        });

        if (!active) return;
        detectorRef.current = detector;
        setIsInitializing(false);

        // Start processing frames
        processFrame();

      } catch (err: any) {
        if (!active) return;
        console.error(err);
        setErrorMsg(err.name === "NotAllowedError" 
          ? "Camera permission denied." 
          : "Failed to initialize camera or AI model.");
        setIsInitializing(false);
      }
    }

    init();

    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (detectorRef.current) detectorRef.current.close();
    };
  }, []);

  const processFrame = () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || isCapturingRef.current) return;

    if (video.readyState >= 2) {
      const nowInMs = Date.now();
      const results = detector.detectForVideo(video, nowInMs);

      if (results.detections.length === 1) {
        const face = results.detections[0].boundingBox;
        if (face) {
          // Normalize coordinates (0 to 1) based on video intrinsic size
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          
          const cx = (face.originX + face.width / 2) / vw;
          const cy = (face.originY + face.height / 2) / vh;
          const widthRatio = face.width / vw;
          const heightRatio = face.height / vh;

          // Relaxed constraints to make auto-capture more forgiving
          const isCentered = cx > 0.15 && cx < 0.85 && cy > 0.15 && cy < 0.85;
          const isRightSize = widthRatio > 0.15 && heightRatio > 0.15;

          if (isCentered && isRightSize) {
            if (faceStatusRef.current !== "steady" && faceStatusRef.current !== "capturing") {
               faceStatusRef.current = "steady";
               setFaceStatus("steady");
               if (steadyStartTimeRef.current === 0) {
                 steadyStartTimeRef.current = nowInMs;
               }
            } else if (faceStatusRef.current === "steady") {
               // If steady for 1.5 seconds, auto capture
               if (nowInMs - steadyStartTimeRef.current > 1500) {
                 capturePhoto();
               }
            }
          } else {
            if (faceStatusRef.current !== "align") {
              faceStatusRef.current = "align";
              setFaceStatus("align");
            }
            steadyStartTimeRef.current = 0;
          }
        }
      } else if (results.detections.length > 1) {
        if (faceStatusRef.current !== "align") {
          faceStatusRef.current = "align";
          setFaceStatus("align");
        }
        steadyStartTimeRef.current = 0;
      } else {
        if (faceStatusRef.current !== "no_face") {
          faceStatusRef.current = "no_face";
          setFaceStatus("no_face");
        }
        steadyStartTimeRef.current = 0;
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  };

  const capturePhoto = () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    faceStatusRef.current = "capturing";
    setFaceStatus("capturing");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the video frame to canvas
    // Note: Since the video is mirrored (scaleX(-1)), we must mirror the canvas drawing too
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        // Stop camera tracks before calling onCapture to free up resources immediately
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        onCapture(file);
      }
    }, "image/jpeg", 0.85);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Camera size={20} />
          Patrol Selfie
        </h2>
        <button 
          onClick={onCancel}
          className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white backdrop-blur transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {isInitializing && !errorMsg && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Waking up AI camera...</p>
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
          <div className="bg-red-500/20 p-4 rounded-full mb-4">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-white font-bold text-lg mb-2">Camera Error</p>
          <p className="text-slate-300 text-sm mb-6">{errorMsg}</p>
          <button 
            onClick={onCancel}
            className="bg-white text-black px-6 py-2.5 rounded-full font-bold"
          >
            Go Back
          </button>
        </div>
      )}

      {/* Video element (mirrored for selfie mode) */}
      <video 
        ref={videoRef}
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Overlay UI */}
      {!isInitializing && !errorMsg && (
        <>
          {/* Semi-transparent mask with oval cutout */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                <mask id="cutout">
                  <rect width="100%" height="100%" fill="white" />
                  <ellipse cx="50%" cy="50%" rx="35%" ry="35%" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#cutout)" />
              {/* Oval Border */}
              <ellipse 
                cx="50%" cy="50%" rx="35%" ry="35%" 
                fill="none" 
                stroke={
                  faceStatus === "steady" || faceStatus === "capturing" ? "#22c55e" : 
                  faceStatus === "align" ? "#eab308" : 
                  "white"
                } 
                strokeWidth="4" 
                strokeDasharray={faceStatus === "steady" ? "none" : "10, 10"}
                className="transition-colors duration-300"
              />
            </svg>
          </div>

          {/* Status Instructions */}
          <div className="absolute bottom-12 inset-x-0 z-20 flex flex-col items-center px-4">
            <div className={`
              px-6 py-3 rounded-full font-bold shadow-lg backdrop-blur text-sm transition-all duration-300
              ${faceStatus === "no_face" ? "bg-black/60 text-white" : ""}
              ${faceStatus === "align" ? "bg-amber-500/90 text-white" : ""}
              ${faceStatus === "steady" ? "bg-green-500 text-white scale-110" : ""}
              ${faceStatus === "capturing" ? "bg-white text-green-600 scale-110" : ""}
            `}>
              {faceStatus === "no_face" && "Look into the camera"}
              {faceStatus === "align" && "Align your face in the oval"}
              {faceStatus === "steady" && "Hold steady..."}
              {faceStatus === "capturing" && "Capturing!"}
            </div>

            {/* Fallback Manual Capture Button (only shows if face is detected but not steady yet) */}
            {faceStatus === "align" && (
              <button
                onClick={capturePhoto}
                className="mt-6 bg-white text-black px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-100 transition-colors"
              >
                Take Photo Anyway
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
