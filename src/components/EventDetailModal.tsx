import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Send,
  MapPin,
  Battery,
  Wifi,
  Globe,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Camera,
  FileText,
} from 'lucide-react';
import { SecurityEvent, SecurityPrefsState } from '../types';
import { AlertDispatcher } from '../utils/alertDispatcher';

interface EventDetailModalProps {
  event: SecurityEvent | null;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onResendAlert: (event: SecurityEvent) => void;
  isResending: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  prefs,
  onResendAlert,
  isResending,
}) => {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const isUnauthorized =
    event.eventType.toLowerCase().includes('unrecognized') || event.status === 'sent' || event.status === 'pending';
  const alertPayload = AlertDispatcher.buildAlertPayload(event, prefs);
  const mapLink =
    event.latitude != null && event.longitude != null
      ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      : null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(alertPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isUnauthorized ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isUnauthorized ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{event.eventType}</h3>
              <p className="text-xs text-slate-400">
                Incident ID #{event.id} • {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            id="close-event-detail-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status Message */}
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              isUnauthorized
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <div className="font-semibold">{event.message}</div>
            {event.dispatchError && (
              <div className="mt-1 text-[11px] text-rose-400">Dispatch error: {event.dispatchError}</div>
            )}
          </div>

          {/* Photo Capture Preview & Biometric Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <Camera className="h-4 w-4 text-blue-400" />
                <span>Stealth Photo Capture</span>
              </div>
              <span className="text-[11px] text-slate-500">Front Camera Snapshot</span>
            </div>

            {event.photoPath ? (
              <div className="relative aspect-video w-full max-h-56 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center">
                <img
                  src={event.photoPath}
                  alt="Captured face incident"
                  className="h-full w-full object-contain"
                />
                {isUnauthorized && (
                  <div className="absolute top-2 right-2 rounded-md bg-rose-500/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    Unrecognized Face
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No photo recorded for this event
              </div>
            )}
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Battery className="h-3.5 w-3.5 text-blue-400" />
                <span>Battery</span>
              </div>
              <div className="text-sm font-bold text-white">
                {event.batteryLevel != null ? `${event.batteryLevel}%` : 'N/A'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span>Network</span>
              </div>
              <div className="text-sm font-bold text-white capitalize">
                {event.networkState || 'Unknown'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Globe className="h-3.5 w-3.5 text-purple-400" />
                <span>IP Address</span>
              </div>
              <div className="text-xs font-mono font-bold text-white truncate">
                {event.ipAddress || '192.168.1.1'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  <span>GPS Geolocation</span>
                </div>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    <span>View Map</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="text-xs font-mono text-slate-200">
                {event.latitude != null && event.longitude != null
                  ? `Lat: ${event.latitude.toFixed(6)}, Lng: ${event.longitude.toFixed(6)} (Alt: ${event.altitude ?? 0}m)`
                  : 'Coordinates not recorded'}
              </div>
            </div>
          </div>

          {/* Formatted Alert Dispatch Payload */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Security Alert Payload (SendGrid / EmailJS Format)</span>
              </div>
              <button
                id="copy-payload-btn"
                onClick={handleCopyPayload}
                className="flex items-center space-x-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 max-h-36 overflow-y-auto">
              {alertPayload}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-4">
          <button
            id="close-event-modal-bottom-btn"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Close
          </button>

          {event.status !== 'authorized' && (
            <button
              id="resend-alert-detail-btn"
              onClick={() => onResendAlert(event)}
              disabled={isResending}
              className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isResending ? 'Dispatching...' : 'Dispatch Alert Email Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
