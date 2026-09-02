import React from 'react';
import {
  Battery,
  BatteryCharging,
  Wifi,
  Globe,
  MapPin,
  Smartphone,
  Shield,
  Activity,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { DeviceTelemetryData } from '../types';

interface TelemetryPanelProps {
  telemetry: DeviceTelemetryData | null;
  isMonitoring: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  isMonitoring,
  onRefresh,
  isRefreshing,
}) => {
  if (!telemetry) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
        <Activity className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Polling device telemetry & security sensors...</p>
      </div>
    );
  }

  const mapLink =
    telemetry.latitude != null && telemetry.longitude != null
      ? `https://maps.google.com/?q=${telemetry.latitude},${telemetry.longitude}`
      : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Radio className={`h-4 w-4 ${isMonitoring ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Real-Time Device Telemetry
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          Last sync: {new Date(telemetry.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Battery Telemetry */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Battery Level</span>
            {telemetry.isCharging ? (
              <BatteryCharging className="h-4 w-4 text-emerald-400" />
            ) : (
              <Battery className="h-4 w-4 text-blue-400" />
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">
                {telemetry.batteryLevel != null ? `${telemetry.batteryLevel}%` : 'N/A'}
              </span>
              {telemetry.isCharging && (
                <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                  (Charging)
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (telemetry.batteryLevel ?? 0) > 30
                    ? 'bg-emerald-500'
                    : (telemetry.batteryLevel ?? 0) > 15
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, telemetry.batteryLevel ?? 0))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Network State */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Network Link</span>
            <Wifi className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold capitalize text-white truncate block">
              {telemetry.networkState}
            </span>
            <div className="mt-1 flex items-center space-x-1 text-xs text-slate-400 truncate">
              <Globe className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="truncate">{telemetry.ipAddress}</span>
            </div>
          </div>
        </div>

        {/* Geolocation Coordinates */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">GPS Geolocation</span>
            <MapPin className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            {telemetry.latitude != null && telemetry.longitude != null ? (
              <>
                <span className="text-xs font-mono font-medium text-slate-200 block truncate">
                  {telemetry.latitude.toFixed(4)}, {telemetry.longitude.toFixed(4)}
                </span>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500">Location pending permission</span>
            )}
          </div>
        </div>

        {/* Device Environment */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Device Profile</span>
            <Smartphone className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-semibold text-white truncate block">
              {telemetry.os} ({telemetry.browser})
            </span>
            <span className="mt-1 text-[11px] text-slate-400 truncate block">
              {telemetry.deviceModel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
