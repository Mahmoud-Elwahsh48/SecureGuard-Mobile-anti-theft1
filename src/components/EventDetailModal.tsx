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
  Copy,
  Check,
  ExternalLink,
  Camera,
  FileText,
  Mail,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { SecurityEvent, SecurityPrefsState } from '../types';
import { AlertDispatcher, DispatchResult } from '../utils/alertDispatcher';

interface EventDetailModalProps {
  event: SecurityEvent | null;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onResendAlert: (event: SecurityEvent, customRecipient?: string) => void;
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
  const [customEmail, setCustomEmail] = useState(prefs.alertRecipientEmail || prefs.ownerEmail);
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  if (!event) return null;

  const isUnauthorized =
    event.eventType.toLowerCase().includes('unrecognized') ||
    event.eventType.toLowerCase().includes('failed') ||
    event.status === 'sent' ||
    event.status === 'pending' ||
    event.status === 'failed';

  const alertPayload = AlertDispatcher.buildAlertPayload(event, prefs, customEmail);
  const mapLink =
    event.latitude != null && event.longitude != null
      ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      : null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(alertPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectDynamicSend = async () => {
    const recipient = customEmail.trim() || prefs.alertRecipientEmail || prefs.ownerEmail;
    if (!recipient) return;

    setIsSendingDirect(true);
    setDispatchResult(null);

    try {
      const result = await AlertDispatcher.dispatchAlert(event, prefs, recipient);
      setDispatchResult(result);
      if (result.success) {
        onResendAlert(event, recipient);
      }
    } catch (err: any) {
      setDispatchResult({
        success: false,
        method: 'Dynamic Dispatch',
        message: err?.message || 'Error executing dynamic email dispatch',
        timestamp: Date.now(),
        recipient,
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div
              className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${
                isUnauthorized ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isUnauthorized ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{event.eventType}</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Incident #{event.id} • {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            id="close-event-detail-modal-btn"
            onClick={onClose}
            aria-label="Close incident detail"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Status Message */}
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              isUnauthorized
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            <div className="font-semibold break-words">{event.message}</div>
            {event.dispatchError && (
              <div className="mt-1 text-[11px] text-rose-400 break-words">Dispatch error: {event.dispatchError}</div>
            )}
          </div>

          {/* Photo Capture Preview & Biometric Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <Camera className="h-4 w-4 text-blue-400" />
                <span>Stealth Photo Capture</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">Front Camera</span>
            </div>

            {event.photoPath ? (
              <div className="relative aspect-video w-full max-h-56 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center">
                <img
                  src={event.photoPath}
                  alt="Captured face incident"
                  className="h-full w-full object-contain"
                />
                {isUnauthorized ? (
                  <div className="absolute top-2 right-2 rounded-lg bg-rose-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-md">
                    Unrecognized Face / Intruder
                  </div>
                ) : (
                  <div className="absolute top-2 right-2 rounded-lg bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-md">
                    Authorized Owner
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No photo recorded for this event
              </div>
            )}
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 min-w-0">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Battery className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Battery</span>
              </div>
              <div className="text-sm font-bold text-white truncate">
                {event.batteryLevel != null ? `${event.batteryLevel}%` : 'N/A'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 min-w-0">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Wifi className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Network</span>
              </div>
              <div className="text-sm font-bold text-white capitalize truncate">
                {event.networkState || 'Unknown'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 min-w-0">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Globe className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="truncate">IP Address</span>
              </div>
              <div className="text-xs font-mono font-bold text-white truncate">
                {event.ipAddress || '192.168.1.1'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
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
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
              <div className="text-xs font-mono text-slate-200 break-all">
                {event.latitude != null && event.longitude != null
                  ? `Lat: ${event.latitude.toFixed(6)}, Lng: ${event.longitude.toFixed(6)}`
                  : 'Coordinates not recorded'}
              </div>
            </div>
          </div>

          {/* Dynamic Email Dispatch Section */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Mail className="h-4 w-4 text-blue-400" />
                <span>Send Incident Report to Email Dynamically</span>
              </div>
              <span className="text-[10px] text-blue-300 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                EmailJS / SendGrid
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  id="incident-dynamic-email-input"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Enter dynamic recipient email..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                id="dispatch-incident-email-btn"
                type="button"
                onClick={handleDirectDynamicSend}
                disabled={isSendingDirect || !customEmail.trim()}
                className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-semibold shadow-lg shadow-blue-600/20 transition disabled:opacity-50 active:scale-95 shrink-0 min-h-[40px]"
              >
                {isSendingDirect ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{isSendingDirect ? 'Sending Email...' : 'Send to Email Now'}</span>
              </button>
            </div>

            {/* Quick Email Shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400">Quick Recipient:</span>
              {prefs.ownerEmail && (
                <button
                  type="button"
                  onClick={() => setCustomEmail(prefs.ownerEmail)}
                  className="text-[10px] text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md transition"
                >
                  Owner ({prefs.ownerEmail})
                </button>
              )}
              {prefs.alertRecipientEmail && prefs.alertRecipientEmail !== prefs.ownerEmail && (
                <button
                  type="button"
                  onClick={() => setCustomEmail(prefs.alertRecipientEmail)}
                  className="text-[10px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md transition"
                >
                  Alerts ({prefs.alertRecipientEmail})
                </button>
              )}
            </div>

            {/* Live Result Feedback */}
            {dispatchResult && (
              <div
                className={`rounded-xl border p-2.5 text-xs ${
                  dispatchResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                  {dispatchResult.success ? (
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>{dispatchResult.method}</span>
                </div>
                <p className="text-[11px] opacity-90 break-words">{dispatchResult.message}</p>
              </div>
            )}
          </div>

          {/* Formatted Alert Dispatch Payload */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="truncate">Alert Payload (Sent to Email)</span>
              </div>
              <button
                id="copy-payload-btn"
                onClick={handleCopyPayload}
                className="flex items-center space-x-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 max-h-36 overflow-y-auto">
              {alertPayload}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <button
            id="close-event-modal-bottom-btn"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[40px]"
          >
            Close
          </button>

          <button
            id="resend-alert-detail-btn"
            onClick={handleDirectDynamicSend}
            disabled={isSendingDirect || isResending}
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95 min-h-[40px]"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSendingDirect || isResending ? 'Sending...' : 'Dispatch to Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

