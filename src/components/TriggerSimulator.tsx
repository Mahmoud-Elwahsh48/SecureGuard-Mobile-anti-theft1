import React, { useState } from 'react';
import {
  Zap,
  Power,
  BatteryCharging,
  Plane,
  RotateCcw,
  AlertTriangle,
  Camera,
  UserCheck,
  UserX,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
} from 'lucide-react';
import { SecurityPrefsState, FaceMatchResult } from '../types';

interface TriggerSimulatorProps {
  prefs: SecurityPrefsState;
  onFireTrigger: (triggerName: string, faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated') => Promise<void>;
  isProcessing: boolean;
  lastResult: { eventType: string; isMatch: boolean; message: string; timestamp: number } | null;
}

export const TriggerSimulator: React.FC<TriggerSimulatorProps> = ({
  prefs,
  onFireTrigger,
  isProcessing,
  lastResult,
}) => {
  const [faceMode, setFaceMode] = useState<'camera' | 'owner_simulated' | 'intruder_simulated'>('camera');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('Screen On');

  const triggers = [
    {
      id: 'Screen On',
      label: 'Screen On / Unlock',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'Triggered upon screen wake or device unlock attempt',
    },
    {
      id: 'Charger Connected',
      label: 'Charger Connected',
      icon: BatteryCharging,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'Triggered when external AC/USB power source is attached',
    },
    {
      id: 'Charger Disconnected',
      label: 'Charger Disconnected',
      icon: Power,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      description: 'Triggered when charging cable is abruptly removed',
    },
    {
      id: 'Airplane Mode Changed',
      label: 'Airplane Mode Changed',
      icon: Plane,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      description: 'Triggered when cellular/radio state changes or airplane mode toggles',
    },
    {
      id: 'Device Boot Completed',
      label: 'Device Boot Completed',
      icon: RotateCcw,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      description: 'Triggered upon device system startup or reboot',
    },
    {
      id: 'Motion & Tamper Alert',
      label: 'Motion / Tamper Alert',
      icon: AlertTriangle,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      description: 'Triggered when device accelerometer detects sudden displacement',
    },
  ];

  const handleExecute = (triggerName: string) => {
    setSelectedTrigger(triggerName);
    onFireTrigger(triggerName, faceMode);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">
            Security Trigger Receiver & Test Engine
          </h2>
          <p className="text-xs text-slate-400">
            Replicates Android broadcast triggers with stealth photo capture, face verification & alert dispatch
          </p>
        </div>

        {/* Face Simulation / Camera Mode Selector */}
        <div className="flex items-center space-x-1 rounded-lg bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            id="face-mode-camera-btn"
            onClick={() => setFaceMode('camera')}
            className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              faceMode === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Use live front webcam for stealth capture"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Live Camera</span>
          </button>
          <button
            id="face-mode-owner-btn"
            onClick={() => setFaceMode('owner_simulated')}
            className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              faceMode === 'owner_simulated'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate Authorized Owner Face"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Owner</span>
          </button>
          <button
            id="face-mode-intruder-btn"
            onClick={() => setFaceMode('intruder_simulated')}
            className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              faceMode === 'intruder_simulated'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate Intruder / Unrecognized Face"
          >
            <UserX className="h-3.5 w-3.5" />
            <span>Intruder</span>
          </button>
        </div>
      </div>

      {/* Trigger Buttons Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {triggers.map((trigger) => {
          const Icon = trigger.icon;
          const isThisTriggerActive = isProcessing && selectedTrigger === trigger.id;

          return (
            <button
              key={trigger.id}
              id={`trigger-btn-${trigger.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              disabled={isProcessing}
              onClick={() => handleExecute(trigger.id)}
              className={`group flex items-start space-x-3 rounded-xl border p-3 text-left transition ${
                isThisTriggerActive
                  ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                  : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/50'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${trigger.color}`}>
                {isThisTriggerActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                ) : (
                  <Icon className="h-5 w-5 transition group-hover:scale-110" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {trigger.label}
                  </span>
                  <Play className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                  {trigger.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Pipeline Execution Feedback */}
      {lastResult && (
        <div
          className={`mt-4 flex items-center justify-between rounded-xl border p-3 text-xs transition ${
            lastResult.isMatch
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {lastResult.isMatch ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 animate-bounce" />
            )}
            <div>
              <span className="font-semibold">{lastResult.eventType}: </span>
              <span>{lastResult.message}</span>
            </div>
          </div>
          <span className="text-[11px] opacity-75 shrink-0 ml-2">
            {new Date(lastResult.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};
