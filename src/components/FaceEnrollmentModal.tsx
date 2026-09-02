import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  UserCheck,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Video,
  Eye,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { FaceVerification } from '../utils/faceVerification';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onSaveBaseline: (embedding: number[], photoDataUrl: string) => void;
  onClearBaseline: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  prefs,
  onSaveBaseline,
  onClearBaseline,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Unable to access front camera', err);
      setCameraError('Camera access denied or unavailable. You can also generate a simulated baseline profile.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureBaselineFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);

    onSaveBaseline(embedding, photoDataUrl);
    setSuccessMessage('Owner face baseline enrolled successfully! Euclidean threshold is active (< 0.65).');
    setIsCapturing(false);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

  const captureSimulatedBaseline = () => {
    setIsCapturing(true);
    // Create a synthesized high-definition biometric avatar canvas
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw simulated biometric portrait
      const grad = ctx.createLinearGradient(0, 0, 300, 300);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 300, 300);

      // Face silhouette
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(150, 120, 60, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders
      ctx.beginPath();
      ctx.ellipse(150, 260, 100, 60, 0, 0, Math.PI * 2);
      ctx.fill();

      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const embedding = FaceVerification.extractEmbeddingFromCanvas(canvas);

      onSaveBaseline(embedding, photoDataUrl);
      setSuccessMessage('Simulated owner face baseline enrolled successfully.');
    }
    setIsCapturing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Owner Biometric Face Enrollment</h3>
              <p className="text-xs text-slate-400">Store baseline facial embedding for intrusion verification</p>
            </div>
          </div>
          <button
            id="close-face-enrollment-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {successMessage && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Camera Stream / Preview Box */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-2" />
                <p className="text-xs text-slate-300 mb-3">{cameraError}</p>
                <button
                  id="enroll-simulated-face-btn"
                  onClick={captureSimulatedBaseline}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition"
                >
                  Generate Simulated Owner Baseline
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Face Target Guideline Overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-44 w-36 rounded-3xl border-2 border-dashed border-blue-400/60 bg-blue-500/5">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-blue-400">
                      Align Face Here
                    </span>
                    {/* Reticle corners */}
                    <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-blue-400" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-blue-400" />
                    <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-blue-400" />
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-blue-400" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!cameraError && (
              <button
                id="capture-baseline-btn"
                onClick={captureBaselineFromVideo}
                disabled={isCapturing}
                className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                <span>Capture & Save Baseline</span>
              </button>
            )}

            {prefs.ownerFaceEmbedding && (
              <button
                id="clear-baseline-btn"
                onClick={onClearBaseline}
                className="flex items-center space-x-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Enrolled Face</span>
              </button>
            )}
          </div>

          {/* Enrolled Face Summary Info */}
          {prefs.ownerFaceEmbedding && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {prefs.ownerFacePhoto ? (
                  <img
                    src={prefs.ownerFacePhoto}
                    alt="Owner Baseline"
                    className="h-10 w-10 rounded-lg object-cover border border-slate-700"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <UserCheck className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Owner Biometrics Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {prefs.ownerFaceEmbedding.length}-point normalized Euclidean vector stored
                  </p>
                </div>
              </div>

              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                Enrolled
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
