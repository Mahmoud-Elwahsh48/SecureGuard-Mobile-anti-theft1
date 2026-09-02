import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Settings, Bell, RefreshCw } from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface NavbarProps {
  prefs: SecurityPrefsState;
  onToggleMonitoring: () => void;
  onOpenEnrollFace: () => void;
  onOpenSettings: () => void;
  onRefreshTelemetry: () => void;
  isRefreshing: boolean;
  unauthorizedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  prefs,
  onToggleMonitoring,
  onOpenEnrollFace,
  onOpenSettings,
  onRefreshTelemetry,
  isRefreshing,
  unauthorizedCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
            {prefs.isMonitoring ? (
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            ) : (
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
            )}
            {prefs.isMonitoring && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-xl truncate">
                SafeGuard Shield
              </h1>
              <span className="hidden xs:inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20 whitespace-nowrap">
                v1.0 Mobile
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Intrusion Detection & Stealth Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Telemetry Refresh */}
          <button
            id="refresh-telemetry-btn"
            onClick={onRefreshTelemetry}
            disabled={isRefreshing}
            title="Refresh Telemetry"
            aria-label="Refresh Telemetry"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Monitoring State Toggle */}
          <button
            id="toggle-monitoring-nav-btn"
            onClick={onToggleMonitoring}
            aria-label="Toggle Monitoring Armed State"
            className={`flex h-10 items-center space-x-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-medium border transition active:scale-95 ${
              prefs.isMonitoring
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-semibold">
              {prefs.isMonitoring ? 'Armed' : 'Disarmed'}
            </span>
            <span className="sm:hidden font-semibold text-[11px]">
              {prefs.isMonitoring ? 'Armed' : 'Paused'}
            </span>
          </button>

          {/* Enroll Face Button */}
          <button
            id="enroll-face-nav-btn"
            onClick={onOpenEnrollFace}
            aria-label="Enroll Owner Face ID"
            className={`flex h-10 items-center space-x-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-medium transition active:scale-95 ${
              prefs.ownerFaceEmbedding
                ? 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-slate-600 hover:bg-slate-700'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
            }`}
          >
            <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="hidden md:inline">
              {prefs.ownerFaceEmbedding ? 'Owner Face Active' : 'Enroll Face'}
            </span>
            <span className="md:hidden text-[11px]">Face ID</span>
          </button>

          {/* Settings Button */}
          <button
            id="open-settings-nav-btn"
            onClick={onOpenSettings}
            title="Configure Security Preferences"
            aria-label="Configure Security Preferences"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white transition active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
