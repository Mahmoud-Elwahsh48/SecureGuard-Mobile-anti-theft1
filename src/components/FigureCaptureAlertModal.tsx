import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Battery,
  Lock,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Camera,
  CheckCircle,
} from 'lucide-react';
import { SecurityEvent } from '../types';

interface FigureCaptureAlertModalProps {
  event: SecurityEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onLockApp: () => void;
  onViewLogs: () => void;
}

export const FigureCaptureAlertModal: React.FC<FigureCaptureAlertModalProps> = ({
  event,
  isOpen,
  onClose,
  onLockApp,
  onViewLogs,
}) => {
  if (!isOpen || !event) return null;

  const isOwner = event.status === 'authorized';

  return (
    <div
      id="figure-capture-alert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
                isOwner
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-400 animate-pulse'
              }`}
            >
              {isOwner ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isOwner
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isOwner ? 'AUTHORIZED VERIFIED' : 'INTRUSION TRIGGERED'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
                {event.eventType}
              </h3>
            </div>
          </div>

          <button
            id="figure-modal-close-btn"
            onClick={onClose}
            aria-label="Close Incident Window"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Captured Figure Display Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner">
          {event.photoPath ? (
            <div className="relative group">
              <img
                src={event.photoPath}
                alt="Captured Figure"
                className="w-full h-56 sm:h-64 object-cover object-center bg-slate-950"
              />
              {/* Scan Overlay Effect */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

              {/* Status Ribbon on Image */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-1.5 rounded-lg bg-slate-950/80 border border-slate-700/80 px-2.5 py-1 text-[11px] font-mono text-cyan-300 backdrop-blur-sm">
                  <Camera className="h-3.5 w-3.5 text-cyan-400" />
                  <span>FIGURE CAPTURED</span>
                </div>

                <div
                  className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm border ${
                    isOwner
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {isOwner ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Owner Face Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span>Unrecognized Face</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-2">
              <Camera className="h-10 w-10 text-slate-600" />
              <p className="text-xs">Camera permissions required to capture optical figure</p>
            </div>
          )}
        </div>

        {/* Incident Context Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Location */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-semibold uppercase">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>Location Coordinates</span>
            </div>
            <div className="text-slate-200 font-medium truncate">
              {event.latitude != null && event.longitude != null
                ? `${event.latitude.toFixed(4)}°, ${event.longitude.toFixed(4)}°`
                : 'Sensor Acquiring...'}
            </div>
            {event.latitude != null && event.longitude != null && (
              <a
                href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-[10px] text-blue-400 hover:text-blue-300"
              >
                <span>View Google Maps</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>

          {/* Battery & Power State */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-semibold uppercase">
              <Battery className="h-3.5 w-3.5 text-amber-400" />
              <span>Battery & Power</span>
            </div>
            <div className="text-slate-200 font-medium">
              {event.batteryLevel != null ? `${event.batteryLevel}%` : '85%'}
              <span className="ml-1 text-[11px] text-slate-400">
                ({event.eventType.toLowerCase().includes('charger') ? 'Power Sensor' : 'Standard'})
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {event.networkState || 'Wi-Fi Online'}
            </div>
          </div>
        </div>

        {/* Message Banner */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
          <span className="font-semibold text-white">Event Note: </span>
          {event.message}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            id="figure-modal-dismiss-btn"
            onClick={onClose}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 px-3 text-xs font-bold text-white hover:bg-slate-700 transition active:scale-95"
          >
            <span>Acknowledge</span>
          </button>

          <button
            id="figure-modal-view-logs-btn"
            onClick={() => {
              onClose();
              onViewLogs();
            }}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 py-2.5 px-3 text-xs font-bold text-blue-300 hover:bg-blue-500/20 transition active:scale-95"
          >
            <span>View Incidents</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            id="figure-modal-lock-app-btn"
            onClick={() => {
              onClose();
              onLockApp();
            }}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
