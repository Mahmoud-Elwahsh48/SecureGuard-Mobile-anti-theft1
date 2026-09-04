import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Camera,
  MapPin,
  Bell,
  Activity,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { PermissionManager, AppPermissionsState } from '../utils/permissionManager';

interface DevicePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: AppPermissionsState;
  onRefresh: () => void;
}

export const DevicePermissionsModal: React.FC<DevicePermissionsModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onRefresh,
}) => {
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [requestingItem, setRequestingItem] = useState<string | null>(null);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);

  if (!isOpen) return null;

  const handleGrantAll = async () => {
    setIsRequestingAll(true);
    try {
      await PermissionManager.requestAllPermissions();
      onRefresh();
    } finally {
      setIsRequestingAll(false);
    }
  };

  const handleGrantCamera = async () => {
    setRequestingItem('camera');
    try {
      await PermissionManager.requestCamera();
      onRefresh();
    } finally {
      setRequestingItem(null);
    }
  };

  const handleGrantLocation = async () => {
    setRequestingItem('location');
    try {
      await PermissionManager.requestLocation();
      onRefresh();
    } finally {
      setRequestingItem(null);
    }
  };

  const handleGrantNotifications = async () => {
    setRequestingItem('notifications');
    try {
      await PermissionManager.requestNotifications();
      onRefresh();
    } finally {
      setRequestingItem(null);
    }
  };

  const handleGrantMotion = async () => {
    setRequestingItem('motion');
    try {
      await PermissionManager.requestMotion();
      onRefresh();
    } finally {
      setRequestingItem(null);
    }
  };

  const allActive =
    permissions.camera.isActive &&
    permissions.location.isActive &&
    (permissions.notifications.isActive || permissions.notifications.status === 'not_supported');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border ${
                allActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              {allActive ? (
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Device Security Permissions</span>
                {allActive && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    All Active
                  </span>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                SafeGuard Shield requires active device permissions for full protection
              </p>
            </div>
          </div>

          <button
            id="close-device-permissions-modal-btn"
            onClick={onClose}
            aria-label="Close permissions dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Banner */}
          {allActive ? (
            <div className="flex items-start space-x-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-200">
                  All Required Permissions are Active
                </span>
                <span>
                  Your device camera, GPS tracking, and notifications are primed and operating in active mode.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-200">
                  Permission Activation Required
                </span>
                <span>
                  SafeGuard Shield requires real-time camera, GPS, and alert permissions to capture optical figures and track device breaches.
                </span>
              </div>
            </div>
          )}

          {/* PERMISSIONS CARDS LIST */}
          <div className="space-y-2.5">
            {/* 1. CAMERA PERMISSION */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-3.5 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    permissions.camera.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : permissions.camera.status === 'denied'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <Camera className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Device Camera
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                        permissions.camera.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : permissions.camera.status === 'denied'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {permissions.camera.isActive
                        ? 'Active & Live'
                        : permissions.camera.status === 'denied'
                        ? 'Blocked'
                        : 'Required'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {permissions.camera.isActive
                      ? 'Pre-warmed optical sensor ready for stealth capture'
                      : 'Required for real face ID enrollment & stealth triggers'}
                  </p>
                </div>
              </div>

              {!permissions.camera.isActive && (
                <button
                  id="grant-camera-perm-row-btn"
                  onClick={handleGrantCamera}
                  disabled={requestingItem === 'camera'}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shrink-0 transition active:scale-95 disabled:opacity-50"
                >
                  {requestingItem === 'camera' ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>

            {/* 2. GEOLOCATION / GPS PERMISSION */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-3.5 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    permissions.location.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : permissions.location.status === 'denied'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      GPS Geolocation
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                        permissions.location.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : permissions.location.status === 'denied'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {permissions.location.isActive
                        ? 'Active (GPS Fix)'
                        : permissions.location.status === 'denied'
                        ? 'Blocked'
                        : 'Required'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {permissions.location.coords
                      ? `Lat: ${permissions.location.coords.latitude.toFixed(4)}°, Lon: ${permissions.location.coords.longitude.toFixed(4)}° (±${permissions.location.coords.accuracy}m)`
                      : 'Pinpoint device coordinates for incident alert emails'}
                  </p>
                </div>
              </div>

              {!permissions.location.isActive && (
                <button
                  id="grant-location-perm-row-btn"
                  onClick={handleGrantLocation}
                  disabled={requestingItem === 'location'}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shrink-0 transition active:scale-95 disabled:opacity-50"
                >
                  {requestingItem === 'location' ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>

            {/* 3. SYSTEM NOTIFICATIONS PERMISSION */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-3.5 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    permissions.notifications.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : permissions.notifications.status === 'denied'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Security Notifications
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                        permissions.notifications.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : permissions.notifications.status === 'denied'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {permissions.notifications.isActive
                        ? 'Active'
                        : permissions.notifications.status === 'denied'
                        ? 'Blocked'
                        : 'Recommended'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {permissions.notifications.isActive
                      ? 'Push notifications active for instant breach notification'
                      : 'Instant system alerts on trigger fire & tampering'}
                  </p>
                </div>
              </div>

              {!permissions.notifications.isActive && (
                <button
                  id="grant-notifications-perm-row-btn"
                  onClick={handleGrantNotifications}
                  disabled={requestingItem === 'notifications'}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shrink-0 transition active:scale-95 disabled:opacity-50"
                >
                  {requestingItem === 'notifications' ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>

            {/* 4. MOTION & SENSORS */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-3.5 gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    permissions.motion.isActive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Motion & Tamper Sensor
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                        permissions.motion.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {permissions.motion.isActive ? 'Active' : 'Standby'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {permissions.motion.isActive
                      ? 'Accelerometer active for physical displacement alerts'
                      : 'Tracks sudden movement, drops, and physical tampering'}
                  </p>
                </div>
              </div>

              {!permissions.motion.isActive && (
                <button
                  id="grant-motion-perm-row-btn"
                  onClick={handleGrantMotion}
                  disabled={requestingItem === 'motion'}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shrink-0 transition active:scale-95 disabled:opacity-50"
                >
                  {requestingItem === 'motion' ? 'Enabling...' : 'Enable'}
                </button>
              )}
            </div>
          </div>

          {/* SETTINGS HELP GUIDE ACCORDION */}
          <div>
            <button
              id="toggle-permission-settings-help-btn"
              onClick={() => setShowSettingsHelp(!showSettingsHelp)}
              className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 py-2 border-t border-slate-800"
            >
              <div className="flex items-center space-x-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300">
                  How to enable permissions in Mobile / Browser settings
                </span>
              </div>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${showSettingsHelp ? 'rotate-90' : ''}`}
              />
            </button>

            {showSettingsHelp && (
              <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Android / iPhone (Mobile)</span>
                    </div>
                    <p>1. Open Device Settings &gt; Apps &gt; Browser / SafeGuard.</p>
                    <p>2. Tap Permissions: Allow Camera and Location.</p>
                    <p>3. Return here and tap "Grant All Permissions".</p>
                  </div>

                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                      <Monitor className="h-3.5 w-3.5 text-sky-400" />
                      <span>Chrome / Safari / Edge</span>
                    </div>
                    <p>1. Click the Lock/Tune icon on the left of the address bar.</p>
                    <p>2. Set Camera, Location, and Notifications to "Allow".</p>
                    <p>3. Tap "Refresh Permissions" below.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {!allActive ? (
              <button
                id="grant-all-permissions-action-btn"
                onClick={handleGrantAll}
                disabled={isRequestingAll}
                className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-blue-500 transition active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50 min-h-[44px]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isRequestingAll ? 'Requesting All Permissions...' : 'Grant All Permissions'}</span>
              </button>
            ) : (
              <button
                id="permissions-all-good-dismiss-btn"
                onClick={onClose}
                className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-95 shadow-lg shadow-emerald-600/20 min-h-[44px]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>All Permissions Active • Continue</span>
              </button>
            )}

            <button
              id="refresh-permissions-btn"
              onClick={onRefresh}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
