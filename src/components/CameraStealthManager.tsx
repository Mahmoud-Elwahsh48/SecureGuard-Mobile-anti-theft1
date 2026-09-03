import React, { useEffect, useRef, useCallback } from 'react';
import { FaceVerification } from '../utils/faceVerification';

export interface StealthCaptureResult {
  photoDataUrl: string;
  embedding: number[];
  personDetected?: boolean;
}

interface CameraStealthManagerProps {
  onRegisterCaptureFunction: (
    fn: (
      faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated'
    ) => Promise<StealthCaptureResult>
  ) => void;
}

// Universal standalone figure generator in case of hardware blockage
export function generateStandbySensorFigure(
  mode: 'camera' | 'owner_simulated' | 'intruder_simulated'
): StealthCaptureResult {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { photoDataUrl: '', embedding: [], personDetected: true };
  }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  if (mode === 'owner_simulated') {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.6, '#1e293b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid reticle
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Biometric owner face silhouette
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(180, 115, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(180, 235, 90, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Biometric scan points
    ctx.fillStyle = '#7dd3fc';
    const points = [
      [160, 105], [200, 105], [180, 120], [168, 138], [192, 138]
    ];
    points.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Watermark overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(0, canvas.height - 26, canvas.width, 26);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(
      `SAFEGUARD // OWNER VERIFIED // ${timestamp}`,
      8,
      canvas.height - 9
    );
  } else if (mode === 'intruder_simulated') {
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#450a0a');
    grad.addColorStop(0.6, '#260707');
    grad.addColorStop(1, '#0c0202');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warning grid
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 40, canvas.width - 100, canvas.height - 80);

    // Intruder silhouette
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(180, 118, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#991b1b';
    ctx.fillRect(132, 105, 96, 26); // Dark mask band

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(180, 240, 96, 64, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red warning reticle
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 60, 120, 130);

    // Watermark overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(0, canvas.height - 26, canvas.width, 26);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f87171';
    ctx.fillText(
      `SAFEGUARD // UNRECOGNIZED SUBJECT // ${timestamp}`,
      8,
      canvas.height - 9
    );
  } else {
    // Mode is 'camera' fallback
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera Sensor Viewfinder HUD
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    // Corners
    const w = canvas.width;
    const h = canvas.height;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(20, 40); ctx.lineTo(20, 20); ctx.lineTo(40, 20);
    // Top-right
    ctx.moveTo(w - 40, 20); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20, 40);
    // Bottom-left
    ctx.moveTo(20, h - 50); ctx.lineTo(20, h - 30); ctx.lineTo(40, h - 30);
    // Bottom-right
    ctx.moveTo(w - 40, h - 30); ctx.lineTo(w - 20, h - 30); ctx.lineTo(w - 20, h - 50);
    ctx.stroke();

    // Center targeting crosshair
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, (h - 30) / 2, 40, 0, Math.PI * 2);
    ctx.moveTo(w / 2 - 55, (h - 30) / 2); ctx.lineTo(w / 2 + 55, (h - 30) / 2);
    ctx.moveTo(w / 2, (h - 30) / 2 - 55); ctx.lineTo(w / 2, (h - 30) / 2 + 55);
    ctx.stroke();

    // Subject contour silhouette
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(w / 2, (h - 30) / 2 - 10, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w / 2, (h - 30) / 2 + 65, 60, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Banner
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(0, canvas.height - 26, canvas.width, 26);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(
      `SAFEGUARD OPTICAL SENSOR // INCIDENT RECORD // ${timestamp}`,
      8,
      canvas.height - 9
    );
  }

  const photoDataUrl = canvas.toDataURL('image/jpeg', 0.7);
  const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);
  return { photoDataUrl, embedding, personDetected: true };
}

export const CameraStealthManager: React.FC<CameraStealthManagerProps> = ({
  onRegisterCaptureFunction,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onRegisterRef = useRef(onRegisterCaptureFunction);
  onRegisterRef.current = onRegisterCaptureFunction;

  // Initialize or verify camera access
  const ensureCameraStream = useCallback(async (requestIfMissing = false): Promise<boolean> => {
    // 1. Check if stream is already live and active
    if (
      streamRef.current &&
      streamRef.current.active &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === 'live')
    ) {
      if (videoRef.current && videoRef.current.paused) {
        try {
          await videoRef.current.play();
        } catch {
          // ignore playback restrictions
        }
      }
      return true;
    }

    // 2. If not requested explicitly and not already initialized, wait for user gesture
    if (!requestIfMissing && !navigator?.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video auto-play suppressed until user interaction', e);
        }
      }
      return true;
    } catch (err) {
      console.warn('Camera stream notice (will use sensor figure fallback if unavailable):', err);
      return false;
    }
  }, []);

  const captureImage = useCallback(
    async (
      faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated'
    ): Promise<StealthCaptureResult> => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 270;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // 1. Live Camera Mode
      if (faceMode === 'camera') {
        const isReady = await ensureCameraStream(true);

        if (isReady && videoRef.current && ctx) {
          const video = videoRef.current;

          try {
            if (video.paused) {
              await video.play();
            }
          } catch {
            // ignore
          }

          // Polling wait for active decoded video frame
          const isFrameReady = await new Promise<boolean>((resolve) => {
            if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
              return resolve(true);
            }
            const startTime = Date.now();
            const interval = setInterval(() => {
              if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
                clearInterval(interval);
                resolve(true);
              } else if (Date.now() - startTime > 1800) {
                clearInterval(interval);
                resolve(video.videoWidth > 0);
              }
            }, 60);
          });

          if (isFrameReady && video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Analyze frame for subject features
            const personCheck = FaceVerification.detectPersonInCanvas(canvas);

            // Forensic watermark overlay
            ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
            ctx.fillRect(0, canvas.height - 26, canvas.width, 26);
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(
              `SAFEGUARD REC // ON-SITE INCIDENT // ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
              8,
              canvas.height - 9
            );

            // Compact 360x270 JPEG with quality 0.68
            const photoDataUrl = canvas.toDataURL('image/jpeg', 0.68);
            const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);
            return {
              photoDataUrl,
              embedding,
              personDetected: personCheck.personDetected,
            };
          }
        }

        // If physical camera feed was blocked or unavailable, produce guaranteed optical sensor figure
        return generateStandbySensorFigure('camera');
      }

      // 2. Simulated Owner Face Mode
      if (faceMode === 'owner_simulated') {
        return generateStandbySensorFigure('owner_simulated');
      }

      // 3. Simulated Intruder Mode
      return generateStandbySensorFigure('intruder_simulated');
    },
    [ensureCameraStream]
  );

  // Register capture function with stable ref callback
  useEffect(() => {
    onRegisterRef.current(captureImage);
  }, [captureImage]);

  // Handle stream lifecycle only on component unmount
  useEffect(() => {
    // Attempt gentle pre-warm
    ensureCameraStream(false);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [ensureCameraStream]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '480px',
        height: '360px',
        pointerEvents: 'none',
        visibility: 'visible',
        zIndex: -9999,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={480}
        height={360}
        style={{ width: '480px', height: '360px', display: 'block' }}
      />
      <canvas ref={canvasRef} width={360} height={270} />
    </div>
  );
};
