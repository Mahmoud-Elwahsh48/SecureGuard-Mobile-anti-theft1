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
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
            {prefs.isMonitoring ? (
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            ) : (
              <Shield className="h-6 w-6 text-slate-400" />
            )}
            {prefs.isMonitoring && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">SafeGuard Shield</h1>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20">
                v1.0 Mobile & Web
              </span>
            </div>
            <p className="text-xs text-slate-400">Intrusion Detection & Stealth Telemetry</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Telemetry Refresh */}
          <button
            id="refresh-telemetry-btn"
            onClick={onRefreshTelemetry}
            disabled={isRefreshing}
            title="Refresh Telemetry"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Monitoring State Pill */}
          <button
            id="toggle-monitoring-nav-btn"
            onClick={onToggleMonitoring}
            className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
              prefs.isMonitoring
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {prefs.isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}
            </span>
            <span className="sm:hidden">{prefs.isMonitoring ? 'Active' : 'Paused'}</span>
          </button>

          {/* Enroll Face Button */}
          <button
            id="enroll-face-nav-btn"
            onClick={onOpenEnrollFace}
            className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              prefs.ownerFaceEmbedding
                ? 'border-slate-700 bg-slate-800/90 text-slate-200 hover:border-slate-600 hover:bg-slate-700'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
            }`}
          >
            <UserCheck className="h-4 w-4 text-blue-400" />
            <span className="hidden md:inline">
              {prefs.ownerFaceEmbedding ? 'Owner Face Enrolled' : 'Enroll Owner Face'}
            </span>
            <span className="md:hidden">Face ID</span>
          </button>

          {/* Settings Button */}
          <button
            id="open-settings-nav-btn"
            onClick={onOpenSettings}
            title="Configure Security Preferences"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
