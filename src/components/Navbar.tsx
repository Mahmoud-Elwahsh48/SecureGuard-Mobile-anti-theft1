import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Lock,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface NavbarProps {
  prefs: SecurityPrefsState;
  onOpenSidebar: () => void;
  unauthorizedCount: number;
  onLockApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  prefs,
  onOpenSidebar,
  unauthorizedCount,
  onLockApp,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-xl safe-top">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-3 gap-2">
        {/* Brand & Application Name - Sequential Two-Row Layout with Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 min-w-0">
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
          <div className="min-w-0 flex items-center space-x-2 select-none">
            <h1 className="flex items-center space-x-1.5 text-sm sm:text-base lg:text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
              <span className="text-blue-400 font-black tracking-wider uppercase">SafeGuard</span>
              <span>Shield</span>
            </h1>
            <span className="hidden sm:inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 ring-1 ring-blue-500/20 whitespace-nowrap">
              v1.0
            </span>
          </div>
        </div>

        {/* Right Controls: Status Badge + Lock Button + Sidebar Trigger Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Status Pill */}
          <div
            className={`hidden xs:flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
              prefs.isMonitoring
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {prefs.isMonitoring ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            )}
            <span className="text-[11px] font-bold tracking-wider uppercase">
              {prefs.isMonitoring ? 'Armed' : 'Disarmed'}
            </span>
          </div>

          {/* Quick Lock Button */}
          {onLockApp && (
            <button
              id="nav-lock-app-btn"
              onClick={onLockApp}
              title="Lock with 4-Digit Security Password"
              className="flex h-9 sm:h-10 items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 sm:px-3 text-xs font-medium text-slate-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition active:scale-95"
            >
              <Lock className="h-4 w-4 text-rose-400" />
              <span className="hidden md:inline text-[11px] font-bold">Lock App</span>
            </button>
          )}

          {/* Primary Sidebar Menu Trigger Button */}
          <button
            id="nav-open-sidebar-btn"
            onClick={onOpenSidebar}
            aria-label="Open Control Panel Sidebar"
            title="Open Control Panel & System Controls"
            className="flex h-9 sm:h-10 items-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-700 hover:text-white transition active:scale-95 shadow-md"
          >
            <Sliders className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="hidden sm:inline font-bold">Control Panel</span>
            <span className="sm:hidden font-bold">Menu</span>
            {unauthorizedCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ml-0.5">
                {unauthorizedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};



