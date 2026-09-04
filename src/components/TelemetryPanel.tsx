import React, { useState } from 'react';
import {
  Battery,
  BatteryCharging,
  Wifi,
  Globe,
  MapPin,
  Smartphone,
  Activity,
  ExternalLink,
  Radio,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { DeviceTelemetryData } from '../types';
import { DeviceTelemetry } from '../utils/telemetry';

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
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [gpsStatusNotice, setGpsStatusNotice] = useState<string | null>(null);

  const handleRequestDirectGps = async () => {
    setGpsRequesting(true);
    setGpsStatusNotice('Requesting device GPS satellite fix...');
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setGpsStatusNotice('Real GPS location locked!');
            await DeviceTelemetry.updateRealGpsPosition(pos.coords);
            onRefresh();
            setTimeout(() => setGpsStatusNotice(null), 4000);
          },
          (err) => {
            setGpsStatusNotice(
              err.code === 1
                ? 'GPS permission denied. Using IP location fallback.'
                : 'GPS timed out. Using IP network location.'
            );
            onRefresh();
            setTimeout(() => setGpsStatusNotice(null), 5000);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      } else {
        setGpsStatusNotice('Geolocation API not supported on this browser.');
        setTimeout(() => setGpsStatusNotice(null), 4000);
      }
    } finally {
      setGpsRequesting(false);
    }
  };

  if (!telemetry) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
        <Activity className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-2" />
        <p className="text-sm">Polling real device telemetry & GPS sensors...</p>
      </div>
    );
  }

  const mapLink =
    telemetry.latitude != null && telemetry.longitude != null
      ? `https://maps.google.com/?q=${telemetry.latitude},${telemetry.longitude}`
      : null;

  const getLocationSourceBadge = () => {
    if (telemetry.locationSource === 'gps_precise') {
      return (
        <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          <Navigation className="h-2.5 w-2.5" />
          <span>High-Precision GPS (±{telemetry.accuracy ?? 5}m)</span>
        </span>
      );
    }
    if (telemetry.locationSource === 'gps_coarse') {
      return (
        <span className="inline-flex items-center space-x-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 ring-1 ring-blue-500/20">
          <Navigation className="h-2.5 w-2.5" />
          <span>Cell/Wi-Fi Coarse GPS (±{telemetry.accuracy ?? 50}m)</span>
        </span>
      );
    }
    if (telemetry.locationSource === 'ip_lookup') {
      return (
        <span className="inline-flex items-center space-x-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
          <Globe className="h-2.5 w-2.5" />
          <span>Real IP Geolocation</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
        <span>Location Pending</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Radio className={`h-4 w-4 ${isMonitoring ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Real-Time Device Telemetry & Location
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span>Synced: {new Date(telemetry.lastUpdated).toLocaleTimeString()}</span>
          <button
            id="refresh-telemetry-panel-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh All Telemetry"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {gpsStatusNotice && (
        <div className="mb-3 flex items-center space-x-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-300">
          <Activity className="h-4 w-4 animate-spin shrink-0 text-blue-400" />
          <span>{gpsStatusNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {/* Battery Telemetry */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:p-3.5 transition hover:border-slate-700 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Battery Level</span>
            {telemetry.isCharging ? (
              <BatteryCharging className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Battery className="h-4 w-4 text-blue-400 shrink-0" />
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {telemetry.batteryLevel != null ? `${telemetry.batteryLevel}%` : 'N/A'}
              </span>
              {telemetry.isCharging && (
                <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 uppercase">
                  (Chg)
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
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:p-3.5 transition hover:border-slate-700 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Network Link</span>
            <Wifi className="h-4 w-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold capitalize text-white truncate block">
              {telemetry.networkState}
            </span>
            <div className="mt-1 flex items-center space-x-1 text-[11px] sm:text-xs text-slate-400 min-w-0">
              <Globe className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="truncate font-mono">{telemetry.ipAddress}</span>
            </div>
          </div>
        </div>

        {/* Real Geolocation Coordinates & Address */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:p-3.5 transition hover:border-slate-700 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Location Tracking</span>
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 min-w-0 space-y-1">
            {telemetry.latitude != null && telemetry.longitude != null ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-100 block truncate">
                    {telemetry.latitude.toFixed(4)}, {telemetry.longitude.toFixed(4)}
                  </span>
                  {mapLink && (
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[10px] text-blue-400 hover:text-blue-300 transition shrink-0 ml-1"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {telemetry.locationAddress && (
                  <p className="text-[10px] text-slate-300 truncate" title={telemetry.locationAddress}>
                    📍 {telemetry.locationAddress}
                  </p>
                )}

                <div className="pt-0.5 flex items-center justify-between">
                  {getLocationSourceBadge()}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 truncate block">Location unavailable</span>
                <button
                  id="grant-gps-btn"
                  onClick={handleRequestDirectGps}
                  disabled={gpsRequesting}
                  className="w-full rounded-lg bg-blue-600/20 border border-blue-500/30 px-2 py-1 text-[10px] font-semibold text-blue-300 hover:bg-blue-600/30 transition active:scale-95"
                >
                  {gpsRequesting ? 'Acquiring...' : 'Grant GPS Access'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Device Environment */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:p-3.5 transition hover:border-slate-700 min-w-0">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Device Profile</span>
            <Smartphone className="h-4 w-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <span className="text-xs sm:text-xs font-semibold text-white truncate block">
              {telemetry.os} ({telemetry.browser})
            </span>
            <span className="mt-1 text-[10px] sm:text-[11px] text-slate-400 truncate block">
              {telemetry.deviceModel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

