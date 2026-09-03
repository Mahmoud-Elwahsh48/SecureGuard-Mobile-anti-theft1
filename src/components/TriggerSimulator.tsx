import React, { useState } from 'react';
import {
  Zap,
  Power,
  BatteryCharging,
  Plane,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  UserX,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
  Camera,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface TriggerSimulatorProps {
  prefs: SecurityPrefsState;
  onFireTrigger: (
    triggerName: string,
    faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated'
  ) => Promise<void>;
  isProcessing: boolean;
  lastResult: {
    eventType: string;
    isMatch: boolean;
    message: string;
    timestamp: number;
    photoPath?: string;
    personDetected?: boolean;
  } | null;
}

export const TriggerSimulator: React.FC<TriggerSimulatorProps> = ({
  prefs: _prefs,
  onFireTrigger,
  isProcessing,
  lastResult,
}) => {
  const [faceMode, setFaceMode] = useState<'camera' | 'owner_simulated' | 'intruder_simulated'>('camera');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('Screen On');

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
    onFireTrigger(triggerName, faceMode);
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
            Test stealth capture & alert dispatch on simulated hardware triggers
          </p>
        </div>

        {/* Face Simulation & Biometric Mode Selector */}
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 w-full sm:w-auto overflow-x-auto gap-0.5">
          <button
            id="face-mode-camera-btn"
            onClick={() => setFaceMode('camera')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
              faceMode === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Use live front camera for stealth capture"
          >
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Camera</span>
          </button>
          <button
            id="face-mode-owner-btn"
            onClick={() => setFaceMode('owner_simulated')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
              faceMode === 'owner_simulated'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate Authorized Owner Face"
          >
            <UserCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Owner</span>
          </button>
          <button
            id="face-mode-intruder-btn"
            onClick={() => setFaceMode('intruder_simulated')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
              faceMode === 'intruder_simulated'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate Intruder / Unrecognized Face"
          >
            <UserX className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Intruder</span>
          </button>
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
              <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border ${trigger.color}`}>
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
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {lastResult.isMatch ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 animate-bounce" />
              )}
              <div className="truncate">
                <span className="font-semibold">{lastResult.eventType}: </span>
                <span>{lastResult.message}</span>
              </div>
            </div>
            <span className="text-[10px] opacity-75 shrink-0 ml-2">
              {new Date(lastResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Figure 1: Incident Capture Inspection Card */}
          {lastResult.photoPath ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                  <Camera className="h-4 w-4 text-blue-400" />
                  <span>Figure 1: On-Site Incident Capture</span>
                </div>
                {lastResult.isMatch ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                    Authorized Owner
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-semibold border border-rose-500/20">
                    Unrecognized Subject / Intruder
                  </span>
                )}
              </div>
              <div className="relative aspect-video max-h-52 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center">
                <img
                  src={lastResult.photoPath}
                  alt="Incident capture"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-400">
              <Camera className="h-4 w-4 text-slate-500 shrink-0" />
              <span>Incident alert telemetry & GPS dispatched.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

