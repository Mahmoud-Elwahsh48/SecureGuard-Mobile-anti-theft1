import React, { useState } from 'react';
import {
  Smartphone,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface OwnerInUseBannerProps {
  prefs: SecurityPrefsState;
  isOwnerActive: boolean;
  remainingOwnerSeconds: number;
  onActivateOwnerMode: () => void;
  onLockOwnerMode: () => void;
  pendingAlert: { eventId: number; remainingSeconds: number; eventType: string } | null;
  onCancelPendingAlert: () => void;
  onOpenFaceModal: () => void;
}

export const OwnerInUseBanner: React.FC<OwnerInUseBannerProps> = ({
  prefs,
  isOwnerActive,
  remainingOwnerSeconds,
  onActivateOwnerMode,
  onLockOwnerMode,
  pendingAlert,
  onCancelPendingAlert,
  onOpenFaceModal,
}) => {
  const [showFacePrompt, setShowFacePrompt] = useState(!prefs.ownerFaceEmbedding);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Pending Intruder Alert Countdown (Top Priority)
  if (pendingAlert) {
    return (
      <div
        id="banner-pending-intruder-alert"
        className="rounded-2xl border-2 border-rose-500 bg-rose-950/80 p-4 shadow-xl shadow-rose-950/50 backdrop-blur-md animate-pulse space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                  Unrecognized Trigger: {pendingAlert.eventType}
                </span>
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-black text-white">
                  {pendingAlert.remainingSeconds}s
                </span>
              </div>
              <p className="mt-0.5 text-sm font-medium text-rose-100">
                Intruder alert email will dispatch to{' '}
                <span className="font-bold underline">{prefs.alertRecipientEmail || prefs.ownerEmail}</span> in{' '}
                <span className="font-bold text-white text-base">{pendingAlert.remainingSeconds} seconds</span>!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              id="btn-cancel-intruder-alert"
              onClick={onCancelPendingAlert}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-400 active:scale-95 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>I am the Owner (Cancel Alert)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 2. Owner Presence / In-Use Status Ribbon */}
      <div
        id="owner-presence-ribbon"
        className={`rounded-2xl border p-3 sm:p-3.5 transition backdrop-blur-md ${
          isOwnerActive
            ? 'border-emerald-500/40 bg-emerald-950/40 shadow-emerald-950/20 shadow-md'
            : 'border-slate-800 bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isOwnerActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ring-2 ring-emerald-500/10'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {isOwnerActive ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <span
                  className={`text-xs sm:text-sm font-bold truncate ${
                    isOwnerActive ? 'text-emerald-300' : 'text-slate-200'
                  }`}
                >
                  {isOwnerActive
                    ? 'Owner Active on Mobile (Safe Mode)'
                    : 'Armed for Intruder (Background Sentinel Active)'}
                </span>

                {isOwnerActive ? (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(remainingOwnerSeconds)} left</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span>Vigilant</span>
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">
                {isOwnerActive
                  ? 'Personal mobile usage safe. Hardware triggers & camera captures will not trigger false intruder emails.'
                  : `Running in background. Any unauthorized trigger will capture the intruder and dispatch alert to ${
                      prefs.alertRecipientEmail || prefs.ownerEmail
                    }.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            {isOwnerActive ? (
              <button
                id="btn-arm-intruder-mode"
                onClick={onLockOwnerMode}
                title="Lock and switch to background intruder detection"
                className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-500/40 hover:bg-slate-750 transition active:scale-95"
              >
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                <span>Arm for Intruder</span>
              </button>
            ) : (
              <button
                id="btn-activate-owner-mode"
                onClick={onActivateOwnerMode}
                title="Tell SafeGuard you are using your phone to avoid false alarms"
                className="flex items-center space-x-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition active:scale-95"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                <span>I'm Using My Phone</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Owner Face ID Enrollment Reminder (Prompts owner to enroll once so camera automatically recognizes them) */}
      {!prefs.ownerFaceEmbedding && showFacePrompt && (
        <div
          id="owner-face-enrollment-prompt"
          className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-amber-200 truncate">
              <span className="font-bold">Tip: Enroll Owner Face ID</span> so the camera automatically recognizes you and skips intruder alerts.
            </p>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              id="btn-prompt-enroll-face"
              onClick={onOpenFaceModal}
              className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 font-bold text-amber-300 hover:bg-amber-500/30 transition text-[11px]"
            >
              Enroll Face
            </button>
            <button
              onClick={() => setShowFacePrompt(false)}
              className="text-slate-400 hover:text-slate-200 p-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
