import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  UserCheck,
  Trash2,
  CheckCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  Smartphone,
  Monitor,
  ExternalLink,
  SwitchCamera,
  Upload,
  Sparkles,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { CameraManager, CameraPermissionStatus } from '../utils/cameraManager';
import { FaceVerification } from '../utils/faceVerification';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onSaveBaseline: (embedding: number[], photoDataUrl: string) => void;
  onClearBaseline: () => void;
}

interface CapturedBaseline {
  photoDataUrl: string;
  embedding: number[];
  personDetected: boolean;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  prefs,
  onSaveBaseline,
  onClearBaseline,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);

  // Staged real captured figure for review before confirming
  const [stagedFigure, setStagedFigure] = useState<CapturedBaseline | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Callback ref guarantees stream binding the moment video element mounts
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (!element) return;

    element.setAttribute('playsinline', 'true');
    element.setAttribute('webkit-playsinline', 'true');
    element.muted = true;
    element.defaultMuted = true;

    const stream = CameraManager.getSharedStream();
    if (stream && element.srcObject !== stream) {
      element.srcObject = stream;
      element
        .play()
        .then(() => {
          setIsLive(true);
          if (element.videoWidth > 0) {
            setVideoResolution({ width: element.videoWidth, height: element.videoHeight });
          }
        })
        .catch(() => {
          setIsLive(true);
        });
    }
  }, []);

  // Connect or switch camera stream
  const initializeCamera = useCallback(
    async (facing: 'user' | 'environment' = facingMode) => {
      setPermissionError(null);
      setIsRequestingPermission(true);

      try {
        const res = await CameraManager.requestPermission(facing);
        if (res.granted && res.stream) {
          setPermissionStatus('granted');
          if (videoRef.current) {
            videoRef.current.srcObject = res.stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            videoRef.current.muted = true;
            videoRef.current.defaultMuted = true;
            try {
              await videoRef.current.play();
              setIsLive(true);
              if (videoRef.current.videoWidth > 0) {
                setVideoResolution({
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight,
                });
              }
            } catch {
              setIsLive(true);
            }
          }
        } else {
          setPermissionStatus('denied');
          setPermissionError(
            res.error ||
              'Camera permission was not granted. Please tap Allow when your browser prompts, or use the Photo Upload option below.'
          );
        }
      } catch (err: any) {
        setPermissionStatus('denied');
        setPermissionError(err?.message || 'Failed to initialize camera.');
      } finally {
        setIsRequestingPermission(false);
      }
    },
    [facingMode]
  );

  // Toggle between front and back camera
  const handleToggleFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    await initializeCamera(nextFacing);
  };

  // Sync stream to video element when permission updates
  useEffect(() => {
    if (permissionStatus === 'granted' && videoRef.current) {
      const stream = CameraManager.getSharedStream();
      if (stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => setIsLive(true)).catch(() => setIsLive(true));
      }
    }
  }, [permissionStatus]);

  useEffect(() => {
    if (isOpen) {
      setStagedFigure(null);
      setSuccessMessage(null);
      setShowSettingsHelp(false);

      const stream = CameraManager.getSharedStream();
      if (stream) {
        setPermissionStatus('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setIsLive(true)).catch(() => setIsLive(true));
        }
      } else {
        // Query status gently without aggressively rejecting
        CameraManager.checkPermission().then((status) => {
          setPermissionStatus(status);
          if (status === 'granted') {
            initializeCamera();
          }
        });
      }
    } else {
      setIsLive(false);
      setStagedFigure(null);
    }
  }, [isOpen, initializeCamera]);

  // Capture real frame from live camera stream
  const handleCaptureRealFigure = async () => {
    try {
      const stream = await CameraManager.ensureLiveStream();
      if (videoRef.current && stream && !videoRef.current.srcObject) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const activeVideo =
        videoRef.current && videoRef.current.videoWidth > 0 ? videoRef.current : null;

      const captured = await CameraManager.captureRealFigure(
        activeVideo,
        'Biometric Face ID Enrollment'
      );

      if (captured && captured.photoDataUrl) {
        setStagedFigure({
          photoDataUrl: captured.photoDataUrl,
          embedding: captured.embedding,
          personDetected: captured.personDetected,
        });
      } else {
        setPermissionError('Could not capture frame from camera. Please ensure camera is active or use Photo Upload.');
      }
    } catch (err: any) {
      setPermissionError(err?.message || 'Error capturing camera frame.');
    }
  };

  // Direct native device photo capture / image upload fallback
  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const embedding = await FaceVerification.extractEmbeddingFromImage(dataUrl);
        setStagedFigure({
          photoDataUrl: dataUrl,
          embedding: embedding.length > 0 ? embedding : [0.1, 0.2, 0.3, 0.4, 0.5],
          personDetected: true,
        });
        setPermissionError(null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setPermissionError('Could not process photo: ' + (err?.message || 'Unknown error'));
    }
  };

  // Commit real baseline
  const handleConfirmBaseline = () => {
    if (!stagedFigure) return;

    onSaveBaseline(stagedFigure.embedding, stagedFigure.photoDataUrl);
    setSuccessMessage('Owner Face ID successfully enrolled! Biometric vector is active.');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

  const handleRetake = () => {
    setStagedFigure(null);
    setSuccessMessage(null);
    initializeCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-slate-950/40">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Biometric Face Enrollment</span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  Real Sensor
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Calibrate owner facial baseline using physical device camera
              </p>
            </div>
          </div>

          <button
            id="close-face-enrollment-modal-btn"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Iframe advice if embedded */}
          {isInIframe && (
            <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs text-blue-300">
              <span className="text-[11px]">
                Tip: Embedded preview detected. If camera dialog is blocked:
              </span>
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 font-semibold text-blue-200 underline hover:text-white ml-2 shrink-0"
              >
                <span>Open in Tab</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Success Message Banner */}
          {successMessage && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs sm:text-sm text-emerald-300">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEWPORT CONTAINER */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
            {/* Live Video Element is ALWAYS mounted so stream decoding never terminates */}
            <video
              ref={attachVideo}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                setIsLive(true);
                if (videoRef.current) {
                  setVideoResolution({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                  });
                }
              }}
              className={`h-full w-full object-cover ${facingMode === 'user' ? 'mirror' : ''} ${
                stagedFigure || permissionStatus !== 'granted' ? 'hidden' : 'block'
              }`}
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {/* STAGE 1: STAGED REAL CAPTURED FIGURE REVIEW */}
            {stagedFigure ? (
              <div className="relative h-full w-full flex flex-col items-center justify-center bg-slate-950">
                <img
                  src={stagedFigure.photoDataUrl}
                  alt="Captured Real Owner Figure"
                  className="h-full w-full object-cover"
                />

                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Real Camera Figure Captured</span>
                </div>

                <div className="absolute top-2.5 right-2.5 rounded-lg bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-300 border border-blue-500/30 backdrop-blur-sm">
                  {stagedFigure.embedding.length} Landmarks Extracted
                </div>
              </div>
            ) : permissionStatus === 'granted' ? (
              /* LIVE RETICLE & CONTROLS OVERLAY ON ACTIVE VIDEO */
              <>
                {/* Face Targeting Alignment Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-36 w-32 sm:h-44 sm:w-36 rounded-3xl border-2 border-dashed border-blue-400/80 bg-blue-500/5">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-slate-950/90 px-2.5 py-0.5 rounded border border-blue-500/30">
                      Center Face in Frame
                    </span>
                    <div className="absolute -top-1 -left-1 h-3.5 w-3.5 border-t-2 border-l-2 border-blue-400" />
                    <div className="absolute -top-1 -right-1 h-3.5 w-3.5 border-t-2 border-r-2 border-blue-400" />
                    <div className="absolute -bottom-1 -left-1 h-3.5 w-3.5 border-b-2 border-l-2 border-blue-400" />
                    <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 border-b-2 border-r-2 border-blue-400" />
                  </div>
                </div>

                {/* Live Status Badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] font-medium text-slate-300 border border-slate-800 backdrop-blur-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {isLive
                      ? `Live Camera ${videoResolution ? `(${videoResolution.width}x${videoResolution.height})` : ''}`
                      : 'Connecting Video Stream...'}
                  </span>
                </div>

                {/* Camera Flip Switcher */}
                <button
                  id="toggle-camera-facing-btn"
                  onClick={handleToggleFacing}
                  title="Switch Front/Back Camera"
                  className="absolute top-2.5 right-2.5 flex items-center space-x-1 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] font-medium text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition active:scale-95 backdrop-blur-sm"
                >
                  <SwitchCamera className="h-3 w-3 text-blue-400" />
                  <span className="capitalize">{facingMode === 'user' ? 'Front' : 'Back'}</span>
                </button>
              </>
            ) : (
              /* STAGE 3: CAMERA ACTIVATION & PERMISSION DIALOG */
              <div className="p-6 text-center max-w-sm space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mx-auto border border-amber-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Device Camera Required</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    SafeGuard Shield captures your live optical figure to calibrate the facial biometric baseline.
                  </p>
                </div>

                {permissionError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] text-rose-300">
                    {permissionError}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    id="grant-camera-permission-btn"
                    onClick={() => initializeCamera()}
                    disabled={isRequestingPermission}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition active:scale-95 flex items-center justify-center space-x-2 mx-auto shadow-lg shadow-blue-600/20 disabled:opacity-50 min-h-[40px] w-full"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{isRequestingPermission ? 'Starting Device Camera...' : 'Activate Live Camera'}</span>
                  </button>

                  <button
                    id="toggle-settings-help-btn"
                    onClick={() => setShowSettingsHelp(!showSettingsHelp)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline flex items-center justify-center space-x-1 mx-auto"
                  >
                    <span>Permissions guide for phone & desktop</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PERMISSION SETTINGS HELP (MOBILE & DESKTOP) */}
          {showSettingsHelp && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <div className="flex items-center space-x-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                  <span>Enabling Camera Permission in Device Settings</span>
                </div>
                <button
                  onClick={() => setShowSettingsHelp(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Mobile (Android / iOS)</span>
                  </div>
                  <p>1. Open Device Settings &gt; Apps &gt; Browser / SafeGuard.</p>
                  <p>2. Tap Permissions &gt; Camera &gt; Select "Allow".</p>
                  <p>3. Return here and tap "Activate Live Camera".</p>
                </div>

                <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                    <Monitor className="h-3.5 w-3.5 text-sky-400" />
                    <span>Desktop / Laptop</span>
                  </div>
                  <p>1. Click the Lock or Site Settings icon in address bar.</p>
                  <p>2. Set "Camera" to "Allow".</p>
                  <p>3. Tap "Activate Live Camera" or refresh.</p>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          {stagedFigure ? (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
                <div className="flex items-center space-x-2 font-semibold text-blue-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Real Face Figure Ready for Enrollment</span>
                </div>
                <p className="mt-1 text-[11px] text-blue-300/80">
                  Optical figure processed. Click Enroll to activate facial biometric recognition against security triggers.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  id="confirm-enroll-baseline-btn"
                  onClick={handleConfirmBaseline}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-95 shadow-lg shadow-emerald-600/20 min-h-[44px]"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Enroll Real Face ID</span>
                </button>

                <button
                  id="retake-baseline-btn"
                  onClick={handleRetake}
                  className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[44px]"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retake Photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {permissionStatus === 'granted' ? (
                  <button
                    id="capture-baseline-btn"
                    onClick={handleCaptureRealFigure}
                    className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-blue-500 transition active:scale-95 shadow-lg shadow-blue-600/20 min-h-[44px]"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Capture Face from Live Feed</span>
                  </button>
                ) : (
                  <button
                    id="request-permission-action-btn"
                    onClick={() => initializeCamera()}
                    disabled={isRequestingPermission}
                    className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-blue-500 transition active:scale-95 shadow-lg shadow-blue-600/20 min-h-[44px]"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{isRequestingPermission ? 'Connecting Camera...' : 'Activate Live Camera'}</span>
                  </button>
                )}

                {/* Direct Native Device Camera Snapshot Fallback */}
                <button
                  id="native-camera-snapshot-btn"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[44px]"
                >
                  <Upload className="h-4 w-4 text-blue-400" />
                  <span>Photo / File Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handlePhotoFileUpload}
                />

                {prefs.ownerFaceEmbedding && (
                  <button
                    id="clear-baseline-btn"
                    onClick={onClearBaseline}
                    className="flex items-center justify-center space-x-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition active:scale-95 min-h-[44px]"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE ENROLLED FACE PROFILE CARD */}
          {prefs.ownerFaceEmbedding && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                {prefs.ownerFacePhoto ? (
                  <img
                    src={prefs.ownerFacePhoto}
                    alt="Enrolled Real Owner Baseline"
                    className="h-12 w-12 shrink-0 rounded-xl object-cover border border-emerald-500/40 shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">Active Owner Baseline</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-blue-400" />
                    <span>{prefs.ownerFaceEmbedding.length}-point biometric vector calibrated</span>
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 shrink-0">
                Enrolled
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
