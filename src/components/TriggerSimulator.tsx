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
  Radio,
  Maximize2,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { CameraManager, CameraPermissionStatus } from '../utils/cameraManager';
import { AppPermissionsState, PermissionManager } from '../utils/permissionManager';
import { DynamicTriggerService, DynamicSensorStatus } from '../utils/dynamicTriggerService';

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
  onOpenFigureModal?: () => void;
}

export const TriggerSimulator: React.FC<TriggerSimulatorProps> = ({
  prefs,
  onFireTrigger,
  isProcessing,
  lastResult,
  permissions,
  onOpenPermissions,
  onOpenFigureModal,
}) => {
  const [selectedTrigger, setSelectedTrigger] = useState<string>('Screen On');
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>('unknown');
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);
  const [sensorStatus, setSensorStatus] = useState<DynamicSensorStatus>(DynamicTriggerService.getStatus());

  useEffect(() => {
    const unsub = CameraManager.subscribeStatus((status) => {
      setCameraPermission(status);
    });
    CameraManager.checkPermission().then((status) => setCameraPermission(status));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = DynamicTriggerService.subscribeStatus((st) => {
      setSensorStatus(st);
    });
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
      description: 'Triggered upon screen wake, unlock or screen light up',
      sensorActive: sensorStatus.screenSensor,
    },
    {
      id: 'Power Button Pressed',
      label: 'Power / Lock Button',
      icon: Power,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'Hardware power button clicked or device screen locked',
      sensorActive: true,
    },
    {
      id: 'Charger Connected',
      label: 'Charger Connected',
      icon: BatteryCharging,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'External AC / USB power adapter attached',
      sensorActive: sensorStatus.batterySensor,
    },
    {
      id: 'Charger Disconnected',
      label: 'Charger Disconnected',
      icon: Power,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      description: 'Charging cable unplugged or AC power severed',
      sensorActive: sensorStatus.batterySensor,
    },
    {
      id: 'Airplane Mode Changed',
      label: 'Airplane Mode Toggle',
      icon: Plane,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      description: 'Airplane mode toggled or network disconnected',
      sensorActive: sensorStatus.networkSensor,
    },
    {
      id: 'Device Boot Completed',
      label: 'Device Boot / Restart',
      icon: RotateCcw,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      description: 'System startup & boot initialization completed',
      sensorActive: true,
    },
    {
      id: 'Motion & Tamper Alert',
      label: 'Motion / Tamper Alert',
      icon: AlertTriangle,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description: 'Sudden displacement & accelerometer spike (>18 m/s²)',
      sensorActive: sensorStatus.motionSensor,
    },
  ];

  const handleExecute = (triggerName: string) => {
    setSelectedTrigger(triggerName);
    DynamicTriggerService.simulateTrigger(triggerName);
    onFireTrigger(triggerName);
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg backdrop-blur-md space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-200">
              Real-Time Dynamic Triggers & Camera Capture
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Automatic background hardware sensors & instant figure capture test console
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

      {/* Dynamic Background Sensor State Banner */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Radio className="h-4 w-4" />
            {prefs.isMonitoring && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center space-x-2">
              <span>Dynamic Hardware Listeners:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${prefs.isMonitoring ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {prefs.isMonitoring ? 'ACTIVE & ARMED' : 'ARM SHIELD TO ACTIVATE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {prefs.isMonitoring
                ? 'Unplugging charger, toggling airplane mode, or waking screen automatically triggers stealth capture!'
                : 'Tap ARM on Shield to enable automatic hardware sensor detection, or click test buttons below.'}
            </p>
          </div>
        </div>

        {/* 4 Sensor Badges */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300 flex items-center space-x-1">
            <span className={`h-1.5 w-1.5 rounded-full ${prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Power / AC</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300 flex items-center space-x-1">
            <span className={`h-1.5 w-1.5 rounded-full ${prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Radio / Net</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300 flex items-center space-x-1">
            <span className={`h-1.5 w-1.5 rounded-full ${prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Screen Wake</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-slate-800 bg-slate-950/80 text-slate-300 flex items-center space-x-1">
            <span className={`h-1.5 w-1.5 rounded-full ${prefs.isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>Tamper G-Force</span>
          </span>
        </div>
      </div>

      {/* Trigger Buttons Grid */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Click Any Sensor Probe Below to Execute Trigger & Capture Figure:
        </div>
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
                className={`group flex items-center space-x-3 rounded-xl sm:rounded-2xl border p-3 sm:p-3.5 text-left transition active:scale-[0.97] min-h-[58px] ${
                  isThisTriggerActive
                    ? 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500 shadow-md'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/50'
                } disabled:cursor-not-allowed disabled:opacity-75`}
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
      </div>

      {/* Live Pipeline Execution Feedback Banner */}
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

          {/* Captured Figure Preview with click to open full view */}
          {lastResult.photoPath && (
            <div
              onClick={onOpenFigureModal}
              className="cursor-pointer rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
            >
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
                  <span className="text-[10px] text-blue-400 inline-flex items-center space-x-1 mt-1 font-semibold">
                    <Maximize2 className="h-3 w-3 mr-1" />
                    <span>Tap to inspect biometric figure & details</span>
                  </span>
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

