import React, { useEffect, useRef } from 'react';
import { FaceVerification } from '../utils/faceVerification';

interface CameraStealthManagerProps {
  onRegisterCaptureFunction: (
    fn: (faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated') => Promise<{
      photoDataUrl: string;
      embedding: number[];
    }>
  ) => void;
}

export const CameraStealthManager: React.FC<CameraStealthManagerProps> = ({
  onRegisterCaptureFunction,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Attempt to initialize front camera in the background
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        // Camera permission not yet granted or unavailable; will fallback to simulation
      }
    };

    initCamera();

    const captureImage = async (
      faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated'
    ): Promise<{ photoDataUrl: string; embedding: number[] }> => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      // 1. If Live Camera mode and video stream is active
      if (faceMode === 'camera' && videoRef.current && videoRef.current.readyState >= 2 && ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);
        return { photoDataUrl, embedding };
      }

      // 2. Simulated Owner Face
      if (faceMode === 'owner_simulated' && ctx) {
        const grad = ctx.createLinearGradient(0, 0, 320, 240);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 320, 240);

        // Biometric owner face silhouette
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(160, 100, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(160, 210, 80, 50, 0, 0, Math.PI * 2);
        ctx.fill();

        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);
        return { photoDataUrl, embedding };
      }

      // 3. Simulated Intruder / Unrecognized Face
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 320, 240);
        grad.addColorStop(0, '#450a0a');
        grad.addColorStop(1, '#1c1917');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 320, 240);

        // Intruder silhouette in low light with hood/mask
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(160, 110, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(120, 95, 80, 30); // Visor/mask band

        ctx.beginPath();
        ctx.ellipse(160, 220, 90, 60, 0, 0, Math.PI * 2);
        ctx.fill();

        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);
        return { photoDataUrl, embedding };
      }

      return {
        photoDataUrl: '',
        embedding: [],
      };
    };

    onRegisterCaptureFunction(captureImage);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onRegisterCaptureFunction]);

  return (
    <div className="hidden" aria-hidden="true">
      <video ref={videoRef} autoPlay playsInline muted width={320} height={240} />
      <canvas ref={canvasRef} width={320} height={240} />
    </div>
  );
};
