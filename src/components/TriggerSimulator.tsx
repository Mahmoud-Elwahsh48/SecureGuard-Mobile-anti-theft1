import React, { useState, useEffect } from 'react';
import {
  Zap,
  Power,
  BatteryCharging,
  Plane,
  RotateCcw,
  AlertTriangle,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { CameraManager, CameraPermissionStatus } from '../utils/cameraManager';
import { AppPermissionsState, PermissionManager } from '../utils/permissionManager';

interface TriggerSimulatorProps {
  prefs: SecurityPrefsState;
  onFireTrigger: (triggerName: string) => Promise<void>;
  isProcessing: boolean;
  lastResult: {
    eventType: string;
    isMatch: boolean;
    message: string;
    timestamp: number;
    photoPath?: string;
    personDetected?: boolean;
  } | null;
  permissions?: AppPermissionsState;
  onOpenPermissions?: () => void;
}

export const TriggerSimulator: React.FC<TriggerSimulatorProps> = ({
  prefs: _prefs,
  onFireTrigger,
  isProcessing,
  lastResult,
  permissions,
  onOpenPermissions,
}) => {
  const [selectedTrigger, setSelectedTrigger] = useState<string>('Screen On');
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>('unknown');
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);

  useEffect(() => {
    const unsub = CameraManager.subscribeStatus((status) => {
      setCameraPermission(status);
    });
    CameraManager.checkPermission().then((status) => setCameraPermission(status));
    return unsub;
  }, []);

  const handleGrantPermission = async () => {
    setIsRequestingPerm(true);
    await PermissionManager.requestAllPermissions();
    setIsRequestingPerm(false);
  };

  const triggers = [
    {
      id: 'Screen On',
      label: 'Screen On / Wake',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'Triggered upon screen wake or unlock attempt',
    },
    {
      id: 'Charger Connected',
      label: 'Charger Connected',
      icon: BatteryCharging,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'External AC/USB power source attached',
    },
    {
      id: 'Charger Disconnected',
      label: 'Charger Removed',
      icon: Power,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'Charging cable abruptly pulled',
    },
    {
      id: 'Airplane Mode Changed',
      label: 'Airplane Mode Toggle',
      icon: Plane,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      description: 'Cellular/radio state changed or toggled',
    },
    {
      id: 'Device Boot Completed',
      label: 'Device Boot / Restart',
      icon: RotateCcw,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      description: 'System startup & boot completed',
    },
    {
      id: 'Motion & Tamper Alert',
      label: 'Motion / Tamper Alert',
      icon: AlertTriangle,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description: 'Sudden displacement & accelerometer spike',
    },
  ];

  const handleExecute = (triggerName: string) => {
    setSelectedTrigger(triggerName);
    onFireTrigger(triggerName);
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-3.5 gap-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-200">
              Security Trigger Simulator
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Test real camera stealth figure capture & alert dispatch on device triggers
          </p>
        </div>

        {/* Permission Indicator / Quick Enable */}
        <div className="flex items-center">
          {permissions ? (
            permissions.allActive ? (
              <button
                type="button"
                id="simulator-perms-status-btn"
                onClick={onOpenPermissions}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="font-semibold">Permissions: All Active</span>
              </button>
            ) : (
              <button
                id="simulator-enable-perms-btn"
                onClick={onOpenPermissions || handleGrantPermission}
                disabled={isRequestingPerm}
                className="flex items-center space-x-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/25 transition active:scale-95 animate-pulse"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  {isRequestingPerm ? 'Requesting...' : 'Permissions Required'}
                </span>
              </button>
            )
          ) : cameraPermission === 'granted' ? (
            <div className="flex items-center space-x-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Camera className="h-3.5 w-3.5" />
              <span className="font-semibold">Camera Permission: Granted</span>
            </div>
          ) : (
            <button
              id="simulator-enable-camera-btn"
              onClick={handleGrantPermission}
              disabled={isRequestingPerm}
              className="flex items-center space-x-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 transition active:scale-95"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {isRequestingPerm ? 'Requesting...' : 'Enable Camera Permission'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Trigger Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
        {triggers.map((trigger) => {
          const Icon = trigger.icon;
          const isThisTriggerActive = isProcessing && selectedTrigger === trigger.id;

          return (
            <button
              key={trigger.id}
              id={`trigger-btn-${trigger.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              disabled={isProcessing}
              onClick={() => handleExecute(trigger.id)}
              className={`group flex items-center space-x-3 rounded-xl sm:rounded-2xl border p-3 sm:p-3.5 text-left transition active:scale-[0.97] min-h-[56px] ${
                isThisTriggerActive
                  ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500 shadow-md'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/50'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border ${trigger.color}`}
              >
                {isThisTriggerActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                ) : (
                  <Icon className="h-5 w-5 transition group-hover:scale-110" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-blue-300 transition truncate">
                    {trigger.label}
                  </span>
                  <Play className="h-3 w-3 text-slate-500 group-hover:text-blue-400 transition ml-1 shrink-0" />
                </div>
                <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
                  {trigger.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Pipeline Execution Feedback */}
      {lastResult && (
        <div className="mt-3.5 space-y-2.5">
          <div
            className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
              lastResult.isMatch
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {lastResult.isMatch ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold uppercase tracking-wider block text-[11px]">
                  {lastResult.eventType}
                </span>
                <span className="text-[11px] opacity-90">{lastResult.message}</span>
              </div>
            </div>

            <span className="text-[10px] opacity-75 font-mono">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Captured Figure Preview */}
          {lastResult.photoPath && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={lastResult.photoPath}
                  alt="Trigger Captured Figure"
                  className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-lg object-cover border border-slate-700 shadow-sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      Real Device Camera Figure Captured
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lastResult.personDetected
                      ? 'Human subject biometric features identified'
                      : 'Optical frame saved with forensic timestamp'}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border shrink-0 ${
                  lastResult.isMatch
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {lastResult.isMatch ? 'Verified Owner' : 'Unrecognized'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
