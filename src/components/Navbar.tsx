import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { AppPermissionsState } from '../utils/permissionManager';

interface NavbarProps {
  prefs: SecurityPrefsState;
  onOpenSidebar: () => void;
  unauthorizedCount: number;
  onLockApp?: () => void;
  permissions?: AppPermissionsState;
  onOpenPermissionsModal?: () => void;
  onToggleMonitoring?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  prefs,
  onOpenSidebar,
  unauthorizedCount,
  onLockApp,
  permissions,
  onOpenPermissionsModal,
  onToggleMonitoring,
}) => {
  const allActive =
    permissions &&
    permissions.camera.isActive &&
    permissions.location.isActive &&
    (permissions.notifications.isActive || permissions.notifications.status === 'not_supported');

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-xl safe-top">
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3 space-y-2.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Brand & Application Logo + Mobile Live Status */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 select-none">
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-900/30 text-blue-400 ring-1 ring-blue-500/30 shadow-lg shadow-blue-900/20">
              {prefs.isMonitoring ? (
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              ) : (
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              )}
              {prefs.isMonitoring && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex items-center space-x-2">
              <h1 className="flex items-center space-x-1.5 text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                <span className="text-blue-400 tracking-wider uppercase">SafeGuard</span>
                <span>Shield</span>
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 ring-1 ring-blue-500/20 whitespace-nowrap">
                v1.0
              </span>
            </div>
          </div>

          {/* Mobile Live Status Chip */}
          <div className="flex items-center space-x-1.5 md:hidden">
            <div
              className={`flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                prefs.isMonitoring
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="uppercase tracking-wider">
                {prefs.isMonitoring ? 'Armed' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons Container: Formatted in Two Rows on Mobile (grid-cols-2), Responsive Toolbar on Desktop (md:flex) */}
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:space-x-2 md:gap-0 shrink-0">
          {/* Row 1, Col 1: Permissions Button */}
          {permissions && onOpenPermissionsModal && (
            <button
              id="nav-permissions-btn"
              onClick={onOpenPermissionsModal}
              title={allActive ? 'Device Permissions: All Active' : 'Device Permissions: Activation Required'}
              className={`h-11 min-h-[44px] md:h-10 flex items-center justify-between px-2.5 sm:px-3 rounded-xl text-xs font-semibold border transition active:scale-[0.98] select-none ${
                allActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 animate-pulse'
              }`}
            >
              <div className="flex items-center space-x-1.5 min-w-0 mr-1.5">
                {allActive ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span className="truncate font-bold">Perms</span>
              </div>
              <div className="shrink-0">
                {allActive ? (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Action</span>
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Row 1, Col 2: System Armed / Disarmed Toggle Button */}
          <button
            id="nav-arm-toggle-btn"
            onClick={onToggleMonitoring}
            title={prefs.isMonitoring ? 'System Armed - Tap to Disarm' : 'System Disarmed - Tap to Arm'}
            className={`h-11 min-h-[44px] md:h-10 flex items-center justify-between px-2.5 sm:px-3 rounded-xl text-xs font-semibold border transition active:scale-[0.98] select-none ${
              prefs.isMonitoring
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <div className="flex items-center space-x-1.5 min-w-0 mr-1.5">
              {prefs.isMonitoring ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <span className="truncate font-bold">Monitor</span>
            </div>
            <div className="shrink-0">
              {prefs.isMonitoring ? (
                <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Armed</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Off</span>
                </span>
              )}
            </div>
          </button>

          {/* Row 2, Col 1: Lock App Button */}
          {onLockApp && (
            <button
              id="nav-lock-app-btn"
              onClick={onLockApp}
              title="Lock with 4-Digit Security Password"
              className="h-11 min-h-[44px] md:h-10 flex items-center justify-between px-2.5 sm:px-3 rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200 transition active:scale-[0.98] select-none shadow-sm text-xs font-semibold"
            >
              <div className="flex items-center space-x-1.5 min-w-0 mr-1.5">
                <Lock className="h-4 w-4 shrink-0 text-rose-400" />
                <span className="truncate font-bold">Lock App</span>
              </div>
              <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/20">
                PIN
              </span>
            </button>
          )}

          {/* Row 2, Col 2: Control Panel Sidebar Button */}
          <button
            id="nav-open-sidebar-btn"
            onClick={onOpenSidebar}
            aria-label="Open Control Panel Sidebar"
            title="Open Control Panel & System Controls"
            className="h-11 min-h-[44px] md:h-10 flex items-center justify-between px-2.5 sm:px-3 rounded-xl border border-slate-700/80 bg-slate-800/90 text-slate-200 hover:border-blue-500/40 hover:bg-slate-750 hover:text-white transition active:scale-[0.98] select-none shadow-sm text-xs font-semibold"
          >
            <div className="flex items-center space-x-1.5 min-w-0 mr-1.5">
              <Sliders className="h-4 w-4 shrink-0 text-blue-400" />
              <span className="truncate font-bold">Control</span>
            </div>
            <div className="shrink-0">
              {unauthorizedCount > 0 ? (
                <span className="inline-flex items-center space-x-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-rose-600/30 animate-pulse">
                  <span>{unauthorizedCount} Alert{unauthorizedCount > 1 ? 's' : ''}</span>
                </span>
              ) : (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/20">
                  Menu
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};



