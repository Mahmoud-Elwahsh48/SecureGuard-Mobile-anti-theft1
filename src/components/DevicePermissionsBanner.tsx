import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  MapPin,
  Bell,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { AppPermissionsState } from '../utils/permissionManager';

interface DevicePermissionsBannerProps {
  permissions: AppPermissionsState;
  onOpenModal: () => void;
}

export const DevicePermissionsBanner: React.FC<DevicePermissionsBannerProps> = ({
  permissions,
  onOpenModal,
}) => {
  const allActive =
    permissions.camera.isActive &&
    permissions.location.isActive &&
    (permissions.notifications.isActive || permissions.notifications.status === 'not_supported');

  return (
    <div
      onClick={onOpenModal}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border p-3 sm:p-4 transition-all active:scale-[0.99] shadow-md ${
        allActive
          ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/90 hover:border-emerald-500/60'
          : 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/90 hover:border-amber-500/70 animate-pulse'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Status & Title */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              allActive
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-400'
            }`}
          >
            {allActive ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold text-white">
                {allActive
                  ? 'Device Permissions: All Active'
                  : 'Device Permissions Required'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border ${
                  allActive
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                }`}
              >
                {allActive ? 'Operating Live' : 'Action Required'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80 mt-0.5">
              {allActive
                ? 'Camera stream, real-time GPS tracking, and notifications are live and active.'
                : 'SafeGuard Shield requires active Camera, GPS Location, and Notifications.'}
            </p>
          </div>
        </div>

        {/* Right Permission Pills & CTA */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <div className="flex items-center space-x-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            {/* Camera Pill */}
            <div
              title={`Camera: ${permissions.camera.isActive ? 'Active' : 'Inactive'}`}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                permissions.camera.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Camera className="h-3 w-3" />
              <span className="hidden xs:inline">Camera</span>
              <span className={`h-1.5 w-1.5 rounded-full ${permissions.camera.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>

            {/* GPS Location Pill */}
            <div
              title={`Location: ${permissions.location.isActive ? 'Active' : 'Inactive'}`}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                permissions.location.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <MapPin className="h-3 w-3" />
              <span className="hidden xs:inline">GPS</span>
              <span className={`h-1.5 w-1.5 rounded-full ${permissions.location.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>

            {/* Notifications Pill */}
            <div
              title={`Notifications: ${permissions.notifications.isActive ? 'Active' : 'Inactive'}`}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                permissions.notifications.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Bell className="h-3 w-3" />
              <span className="hidden xs:inline">Alerts</span>
              <span className={`h-1.5 w-1.5 rounded-full ${permissions.notifications.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>

            {/* Motion Pill */}
            <div
              title={`Motion Sensor: ${permissions.motion.isActive ? 'Active' : 'Standby'}`}
              className={`hidden sm:flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                permissions.motion.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Activity className="h-3 w-3" />
              <span>Sensors</span>
            </div>
          </div>

          <div className="flex items-center text-xs font-semibold text-blue-400 pl-1">
            <span className="hidden md:inline">{allActive ? 'View Status' : 'Activate All'}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
