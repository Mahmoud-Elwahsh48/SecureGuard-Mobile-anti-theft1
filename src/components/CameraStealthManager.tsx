import React, { useEffect, useRef, useCallback } from 'react';
import { CameraManager, RealCameraCaptureResult } from '../utils/cameraManager';

export interface StealthCaptureResult {
  photoDataUrl?: string;
  embedding: number[];
  personDetected?: boolean;
  error?: string;
}

interface CameraStealthManagerProps {
  onRegisterCaptureFunction: (
    fn: (faceMode?: string) => Promise<StealthCaptureResult>
  ) => void;
}

export const CameraStealthManager: React.FC<CameraStealthManagerProps> = ({
  onRegisterCaptureFunction,
}) => {
  const stealthVideoRef = useRef<HTMLVideoElement | null>(null);

  // Sync stream to stealth video element
  const syncStealthStream = useCallback(async () => {
    if (!stealthVideoRef.current) return;
    const stream = await CameraManager.ensureLiveStream();
    if (stream && stealthVideoRef.current.srcObject !== stream) {
      stealthVideoRef.current.srcObject = stream;
      stealthVideoRef.current.muted = true;
      stealthVideoRef.current.defaultMuted = true;
      stealthVideoRef.current.setAttribute('playsinline', 'true');
      stealthVideoRef.current.setAttribute('webkit-playsinline', 'true');
      try {
        await stealthVideoRef.current.play();
      } catch {
        // autoplay may require user gesture
      }
    }
  }, []);

  // Capture real optical figure directly from live camera stream
  const captureImage = useCallback(async (faceMode?: string): Promise<StealthCaptureResult> => {
    try {
      await syncStealthStream();
      const activeVideo =
        stealthVideoRef.current && stealthVideoRef.current.videoWidth > 0
          ? stealthVideoRef.current
          : null;

      const realCapture: RealCameraCaptureResult | null =
        await CameraManager.captureRealFigure(activeVideo, faceMode || 'Security Sensor Detection');

      if (realCapture && realCapture.photoDataUrl) {
        return {
          photoDataUrl: realCapture.photoDataUrl,
          embedding: realCapture.embedding,
          personDetected: realCapture.personDetected ?? true,
        };
      }

      return {
        photoDataUrl: undefined,
        embedding: [],
        personDetected: false,
        error: 'No camera frame captured',
      };
    } catch (err: any) {
      console.warn('Real camera stealth capture notice:', err);
      return {
        photoDataUrl: undefined,
        embedding: [],
        personDetected: false,
        error: err?.message || 'Camera capture error',
      };
    }
  }, [syncStealthStream]);

  useEffect(() => {
    onRegisterCaptureFunction(captureImage);
  }, [captureImage, onRegisterCaptureFunction]);

  // Pre-warm camera permission and stream gently if already granted
  useEffect(() => {
    CameraManager.checkPermission().then((status) => {
      if (status === 'granted') {
        syncStealthStream().catch(() => {});
      }
    });
  }, [syncStealthStream]);

  return (
    <video
      ref={stealthVideoRef}
      autoPlay
      playsInline
      muted
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: '0px',
        right: '0px',
        width: '2px',
        height: '2px',
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -100,
      }}
    />
  );
};
