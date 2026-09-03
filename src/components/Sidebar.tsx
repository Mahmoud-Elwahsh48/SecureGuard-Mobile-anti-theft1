import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Settings,
  Bell,
  RefreshCw,
  Lock,
  Unlock,
  Zap,
  Radio,
  X,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onToggleMonitoring: () => void;
  onOpenEnrollFace: () => void;
  onOpenSettings: () => void;
  onRefreshTelemetry: () => void;
  onOpenChangePin?: () => void;
  onLockApp?: () => void;
  isRefreshing: boolean;
  unauthorizedCount: number;
  totalEventsCount: number;
  activeTab?: 'shield' | 'triggers' | 'telemetry' | 'logs';
  onSelectTab?: (tab: 'shield' | 'triggers' | 'telemetry' | 'logs') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  prefs,
  onToggleMonitoring,
  onOpenEnrollFace,
  onOpenSettings,
  onRefreshTelemetry,
  onOpenChangePin,
  onLockApp,
  isRefreshing,
  unauthorizedCount,
  totalEventsCount,
  activeTab,
  onSelectTab,
}) => {
  return (
    <>
      {/* Backdrop overlay for mobile & closed-state dismissal */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Slide-over Sidebar Drawer */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 right-0 lg:right-auto lg:left-0 z-50 h-full w-[290px] sm:w-[320px] bg-slate-900 border-l lg:border-l-0 lg:border-r border-slate-800/90 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/90 bg-slate-950/50 safe-top">
          <div className="flex items-center space-x-2.5">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-900/30 text-blue-400 ring-1 ring-blue-500/30">
              {prefs.isMonitoring ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-blue-400">
                SafeGuard
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white">
                Shield
              </span>
            </div>
          </div>

          <button
            id="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Control Panel"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Control Actions Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Section: Primary System State */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              System Protection
            </div>

            {/* Arm / Disarm Primary Control */}
            <button
              id="sidebar-toggle-monitoring-btn"
              onClick={() => {
                onToggleMonitoring();
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition active:scale-[0.98] shadow-md ${
                prefs.isMonitoring
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    prefs.isMonitoring
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {prefs.isMonitoring ? (
                    <Unlock className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {prefs.isMonitoring ? 'Monitoring Active' : 'Protection Paused'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {prefs.isMonitoring ? 'Tap to Disarm' : 'Tap to Arm Shield'}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  prefs.isMonitoring
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                }`}
              >
                {prefs.isMonitoring ? 'ARMED' : 'DISARMED'}
              </span>
            </button>
          </div>

          {/* Section: Core Hardware & Biometrics Controls */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Header Actions & Hardware Controls
            </div>

            <div className="space-y-2">
              {/* 1. Face ID Biometric Enrollment */}
              <button
                id="sidebar-enroll-face-btn"
                onClick={() => {
                  onOpenEnrollFace();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">
                      Face ID Biometrics
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {prefs.ownerFaceEmbedding
                        ? 'Enrolled (Threshold < 0.65)'
                        : 'Not Enrolled'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>

              {/* 2. Refresh Telemetry & GPS Sensors */}
              <button
                id="sidebar-refresh-telemetry-btn"
                onClick={onRefreshTelemetry}
                disabled={isRefreshing}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <RefreshCw
                      className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-300' : ''}`}
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">
                      Refresh Telemetry
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isRefreshing ? 'Polling Sensors...' : 'GPS, Battery & Network'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  SYNC
                </span>
              </button>

              {/* 3. 4-Digit Security Password & PIN Security */}
              {onOpenChangePin && (
                <button
                  id="sidebar-change-pin-btn"
                  onClick={() => {
                    onOpenChangePin();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white">
                        4-Digit Security Password
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {prefs.securityPin ? 'PIN Configured (4 digits)' : 'Default (1234)'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
              )}

              {/* 4. Instant Lock App */}
              {onLockApp && (
                <button
                  id="sidebar-instant-lock-btn"
                  onClick={() => {
                    onLockApp();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/20 transition active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-rose-200">
                        Lock Application
                      </div>
                      <div className="text-[11px] text-rose-300/80">
                        Require 4-digit PIN to unlock
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                    LOCK
                  </span>
                </button>
              )}

              {/* 5. Settings & Alert Configuration */}
              <button
                id="sidebar-open-settings-btn"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">
                      Security Settings
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Alerts, SendGrid & Audio
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Section: Navigation Shortcuts in Two Rows */}
          {onSelectTab && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Core Features (2 Rows)
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Row 1: Shield */}
                <button
                  id="sidebar-nav-shield-btn"
                  onClick={() => {
                    onSelectTab('shield');
                    onClose();
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border transition ${
                    activeTab === 'shield'
                      ? 'border-blue-500 bg-blue-500/15 text-white'
                      : 'border-slate-800/80 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="h-4 w-4 mb-1 text-blue-400" />
                  <span className="text-xs font-semibold">Shield</span>
                </button>

                {/* Row 1: Triggers */}
                <button
                  id="sidebar-nav-triggers-btn"
                  onClick={() => {
                    onSelectTab('triggers');
                    onClose();
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border transition ${
                    activeTab === 'triggers'
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-slate-800/80 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="h-4 w-4 mb-1 text-amber-400" />
                  <span className="text-xs font-semibold">Triggers</span>
                </button>

                {/* Row 2: GPS & Telemetry */}
                <button
                  id="sidebar-nav-telemetry-btn"
                  onClick={() => {
                    onSelectTab('telemetry');
                    onClose();
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border transition ${
                    activeTab === 'telemetry'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-slate-800/80 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="h-4 w-4 mb-1 text-emerald-400" />
                  <span className="text-xs font-semibold">GPS & Telemetry</span>
                </button>

                {/* Row 2: Incidents */}
                <button
                  id="sidebar-nav-logs-btn"
                  onClick={() => {
                    onSelectTab('logs');
                    onClose();
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border transition relative ${
                    activeTab === 'logs'
                      ? 'border-purple-500 bg-purple-500/15 text-white'
                      : 'border-slate-800/80 bg-slate-950/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bell className="h-4 w-4 mb-1 text-purple-400" />
                  <span className="text-xs font-semibold">Incidents</span>
                  {unauthorizedCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                      {unauthorizedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section: Status Diagnostics Footer */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-[11px] space-y-2 text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Security Diagnostics</span>
              <span className="text-[10px] text-emerald-400 font-mono">OK</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Stealth Camera</span>
              <span className="text-emerald-400 font-medium">Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Alert Routing</span>
              <span className="text-slate-200 font-medium truncate max-w-[120px]">
                {prefs.alertRecipientEmail || 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Recorded Events</span>
              <span className="text-slate-200 font-medium">{totalEventsCount}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
