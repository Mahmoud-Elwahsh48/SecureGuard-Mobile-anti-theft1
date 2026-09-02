import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Settings,
  Bell,
  Radio,
  Activity,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SecurityEvent, SecurityPrefsState, DeviceTelemetryData } from './types';
import { SecurityStorage } from './utils/securityStorage';
import { DeviceTelemetry } from './utils/telemetry';
import { FaceVerification } from './utils/faceVerification';
import { AlertDispatcher } from './utils/alertDispatcher';
import { Navbar } from './components/Navbar';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TriggerSimulator } from './components/TriggerSimulator';
import { SecurityEventsList } from './components/SecurityEventsList';
import { FaceEnrollmentModal } from './components/FaceEnrollmentModal';
import { EventDetailModal } from './components/EventDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { CameraStealthManager } from './components/CameraStealthManager';

export function App() {
  const [prefs, setPrefs] = useState<SecurityPrefsState>(SecurityStorage.getPrefs());
  const [events, setEvents] = useState<SecurityEvent[]>(SecurityStorage.getAllEvents());
  const [telemetry, setTelemetry] = useState<DeviceTelemetryData | null>(null);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [isProcessingTrigger, setIsProcessingTrigger] = useState(false);
  const [lastTriggerResult, setLastTriggerResult] = useState<{
    eventType: string;
    isMatch: boolean;
    message: string;
    timestamp: number;
  } | null>(null);

  // Modals
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [isResendingId, setIsResendingId] = useState<number | null>(null);

  // Quick form inline fields (replicating Android MainActivity directly)
  const [quickOwnerEmail, setQuickOwnerEmail] = useState(prefs.ownerEmail);
  const [quickRecipientEmail, setQuickRecipientEmail] = useState(prefs.alertRecipientEmail);
  const [quickApiKey, setQuickApiKey] = useState(prefs.sendGridApiKey);
  const [quickSavedToast, setQuickSavedToast] = useState<string | null>(null);

  // Camera stealth capture delegate
  const stealthCaptureRef = useRef<
    ((faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated') => Promise<{
      photoDataUrl: string;
      embedding: number[];
    }>) | null
  >(null);

  // Sound alert synthesizer using Web Audio API
  const playAlertChime = useCallback((isBreach: boolean) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isBreach ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isBreach ? 880 : 587.33, ctx.currentTime);
      if (isBreach) {
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  const refreshTelemetry = useCallback(async () => {
    setIsRefreshingTelemetry(true);
    try {
      const data = await DeviceTelemetry.collectFullTelemetry();
      setTelemetry(data);
    } catch (e) {
      console.error('Telemetry refresh failed', e);
    } finally {
      setIsRefreshingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 30000);
    return () => clearInterval(interval);
  }, [refreshTelemetry]);

  // Handle Quick Save & Enable Monitoring from Main View
  const handleQuickEnableMonitoring = () => {
    const updated = SecurityStorage.savePrefs({
      ownerEmail: quickOwnerEmail.trim(),
      alertRecipientEmail: quickRecipientEmail.trim(),
      sendGridApiKey: quickApiKey.trim(),
      isMonitoring: true,
    });
    setPrefs(updated);
    setQuickSavedToast('Monitoring enabled & preferences saved successfully!');
    setTimeout(() => setQuickSavedToast(null), 3000);
  };

  const handleToggleMonitoring = () => {
    const updated = SecurityStorage.savePrefs({
      isMonitoring: !prefs.isMonitoring,
    });
    setPrefs(updated);
  };

  const handleSaveBaseline = (embedding: number[], photoDataUrl: string) => {
    const updated = SecurityStorage.savePrefs({
      ownerFaceEmbedding: embedding,
      ownerFacePhoto: photoDataUrl,
      enrolledTimestamp: Date.now(),
    });
    setPrefs(updated);
  };

  const handleClearBaseline = () => {
    const updated = SecurityStorage.savePrefs({
      ownerFaceEmbedding: null,
      ownerFacePhoto: null,
      enrolledTimestamp: null,
    });
    setPrefs(updated);
  };

  // Execute Security Monitoring Trigger (replicates SecurityMonitoringService.kt)
  const handleFireTrigger = async (
    triggerName: string,
    faceMode: 'camera' | 'owner_simulated' | 'intruder_simulated'
  ) => {
    if (!prefs.isMonitoring) {
      alert('Security monitoring is currently paused. Please enable monitoring first.');
      return;
    }

    setIsProcessingTrigger(true);

    try {
      // 1. Capture photo & face embedding
      let photoDataUrl: string | undefined = undefined;
      let candidateEmbedding: number[] = [];

      if (stealthCaptureRef.current) {
        const captureResult = await stealthCaptureRef.current(faceMode);
        photoDataUrl = captureResult.photoDataUrl;
        candidateEmbedding = captureResult.embedding;
      }

      // 2. Perform Face Verification
      let isOwner = false;
      if (faceMode === 'owner_simulated') {
        isOwner = true;
      } else if (faceMode === 'intruder_simulated') {
        isOwner = false;
      } else {
        // Camera mode: compare candidate vs enrolled baseline
        const matchResult = FaceVerification.verifyMatch(
          candidateEmbedding,
          prefs.ownerFaceEmbedding
        );
        isOwner = matchResult.isMatch;
      }

      const finalEventType = !isOwner ? `${triggerName} - Unrecognized Face` : triggerName;
      const message = isOwner
        ? 'Security condition detected and owner verified'
        : 'Unauthorized access suspected';

      // 3. Collect real-time telemetry snapshot
      const currentTelemetry = telemetry || (await DeviceTelemetry.collectFullTelemetry());

      // 4. Create Security Event in DB
      const newEvent = SecurityStorage.insertEvent({
        eventType: finalEventType,
        timestamp: Date.now(),
        message,
        photoPath: photoDataUrl,
        latitude: currentTelemetry.latitude,
        longitude: currentTelemetry.longitude,
        altitude: currentTelemetry.altitude,
        batteryLevel: currentTelemetry.batteryLevel,
        networkState: currentTelemetry.networkState,
        ipAddress: currentTelemetry.ipAddress,
        status: isOwner ? 'authorized' : 'pending',
        deviceInfo: currentTelemetry.deviceModel,
      });

      // Update local events state
      setEvents(SecurityStorage.getAllEvents());

      // Update last result banner
      setLastTriggerResult({
        eventType: finalEventType,
        isMatch: isOwner,
        message,
        timestamp: Date.now(),
      });

      if (prefs.soundAlert) {
        playAlertChime(!isOwner);
      }

      // 5. If Unauthorized: Dispatch alert email payload (replicates AlertDispatchWorker.kt)
      if (!isOwner) {
        const dispatchResult = await AlertDispatcher.dispatchAlert(newEvent, prefs);
        if (dispatchResult.success) {
          SecurityStorage.updateEventStatus(newEvent.id, 'sent');
        } else {
          SecurityStorage.updateEventStatus(newEvent.id, 'failed', dispatchResult.message);
        }
        setEvents(SecurityStorage.getAllEvents());
      }
    } catch (err) {
      console.error('Trigger monitoring failed', err);
    } finally {
      setIsProcessingTrigger(false);
    }
  };

  const handleResendAlert = async (event: SecurityEvent) => {
    setIsResendingId(event.id);
    try {
      const result = await AlertDispatcher.dispatchAlert(event, prefs);
      if (result.success) {
        SecurityStorage.updateEventStatus(event.id, 'sent');
      } else {
        SecurityStorage.updateEventStatus(event.id, 'failed', result.message);
      }
      setEvents(SecurityStorage.getAllEvents());
    } catch (e) {
      console.error('Resend failed', e);
    } finally {
      setIsResendingId(null);
    }
  };

  const handleDeleteEvent = (id: number) => {
    SecurityStorage.deleteEvent(id);
    setEvents(SecurityStorage.getAllEvents());
    if (selectedEvent?.id === id) {
      setSelectedEvent(null);
    }
  };

  const handleClearAllEvents = () => {
    if (window.confirm('Are you sure you want to clear all security incident logs?')) {
      SecurityStorage.clearEvents();
      setEvents([]);
    }
  };

  const unauthorizedCount = events.filter(
    (e) => e.eventType.toLowerCase().includes('unrecognized') || e.status === 'sent'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-24 md:pb-8">
      {/* Background Stealth Camera Manager */}
      <CameraStealthManager
        onRegisterCaptureFunction={(fn) => {
          stealthCaptureRef.current = fn;
        }}
      />

      {/* Top Navbar */}
      <Navbar
        prefs={prefs}
        onToggleMonitoring={handleToggleMonitoring}
        onOpenEnrollFace={() => setIsFaceModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefreshTelemetry={refreshTelemetry}
        isRefreshing={isRefreshingTelemetry}
        unauthorizedCount={unauthorizedCount}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 py-4 sm:px-6 sm:py-6 space-y-5 sm:space-y-6">
        {/* Core System Status & Quick Setup Bar (Matches Android MainActivity) */}
        <section id="section-overview" className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-4 sm:p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 sm:pb-5">
            <div className="flex items-start space-x-3.5 sm:space-x-4">
              <div
                className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner ${
                  prefs.isMonitoring
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                {prefs.isMonitoring ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-white sm:text-lg">
                    SafeGuard Shield Active Protection
                  </h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                      prefs.isMonitoring
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {prefs.isMonitoring ? 'Armed & Monitoring' : 'Protection Paused'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Stealth front camera capture, ML Euclidean face recognition (&lt;0.65 threshold), and automated multi-channel alert dispatch.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <button
                id="main-enroll-face-btn"
                onClick={() => setIsFaceModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95 shadow-sm min-h-[42px]"
              >
                <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="whitespace-nowrap">
                  {prefs.ownerFaceEmbedding ? 'Enrolled Face Active' : 'Enroll Owner Face'}
                </span>
              </button>

              <button
                id="main-toggle-monitoring-btn"
                onClick={handleToggleMonitoring}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 rounded-xl px-4 py-2.5 sm:py-2 text-xs font-semibold transition shadow-md active:scale-95 min-h-[42px] ${
                  prefs.isMonitoring
                    ? 'bg-amber-600/90 text-white hover:bg-amber-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {prefs.isMonitoring ? (
                  <>
                    <Unlock className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Disarm Monitoring</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Arm & Enable</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Configuration Form (Replicating MainActivity.kt fields) */}
          <div className="pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Security Credentials & Alert Routing
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Owner Email
                </label>
                <input
                  id="main-owner-email-input"
                  type="email"
                  value={quickOwnerEmail}
                  onChange={(e) => setQuickOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm sm:text-xs text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[42px] sm:min-h-0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Alert Recipient Email
                </label>
                <input
                  id="main-alert-recipient-input"
                  type="email"
                  value={quickRecipientEmail}
                  onChange={(e) => setQuickRecipientEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm sm:text-xs text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[42px] sm:min-h-0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  SendGrid API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    id="main-api-key-input"
                    type="password"
                    value={quickApiKey}
                    onChange={(e) => setQuickApiKey(e.target.value)}
                    placeholder="SG.xxxxx"
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm sm:text-xs text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono min-h-[42px] sm:min-h-0"
                  />
                  <button
                    id="main-save-config-btn"
                    onClick={handleQuickEnableMonitoring}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white hover:bg-blue-500 transition active:scale-95 shrink-0 min-h-[42px] sm:min-h-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {quickSavedToast && (
              <div className="mt-3 flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{quickSavedToast}</span>
              </div>
            )}
          </div>
        </section>

        {/* Real-time Telemetry Panel */}
        <section id="section-telemetry">
          <TelemetryPanel
            telemetry={telemetry}
            isMonitoring={prefs.isMonitoring}
            onRefresh={refreshTelemetry}
            isRefreshing={isRefreshingTelemetry}
          />
        </section>

        {/* Trigger Simulator & Test Engine */}
        <section id="section-triggers">
          <TriggerSimulator
            prefs={prefs}
            onFireTrigger={handleFireTrigger}
            isProcessing={isProcessingTrigger}
            lastResult={lastTriggerResult}
          />
        </section>

        {/* Security Events Incident Log */}
        <section id="section-logs">
          <SecurityEventsList
            events={events}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            onResendAlert={handleResendAlert}
            onDeleteEvent={handleDeleteEvent}
            onClearAll={handleClearAllEvents}
            isResendingId={isResendingId}
          />
        </section>
      </main>

      {/* Mobile Sticky Bottom Navigation Bar (Optimized for One-Handed Thumb Operation) */}
      <nav aria-label="Mobile Navigation Bar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl px-2 py-1.5 safe-bottom">
        <div className="flex items-center justify-around">
          <button
            id="mobile-nav-overview-btn"
            onClick={() => {
              document.getElementById('section-overview')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-blue-400 active:scale-95 transition min-w-[56px]"
          >
            <Shield className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Armed</span>
          </button>

          <button
            id="mobile-nav-triggers-btn"
            onClick={() => {
              document.getElementById('section-triggers')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-blue-400 active:scale-95 transition min-w-[56px]"
          >
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="text-[10px] font-medium mt-0.5">Triggers</span>
          </button>

          <button
            id="mobile-nav-telemetry-btn"
            onClick={() => {
              document.getElementById('section-telemetry')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-blue-400 active:scale-95 transition min-w-[56px]"
          >
            <Radio className="h-5 w-5 text-blue-400" />
            <span className="text-[10px] font-medium mt-0.5">Telemetry</span>
          </button>

          <button
            id="mobile-nav-logs-btn"
            onClick={() => {
              document.getElementById('section-logs')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="relative flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-blue-400 active:scale-95 transition min-w-[56px]"
          >
            <Bell className="h-5 w-5 text-emerald-400" />
            <span className="text-[10px] font-medium mt-0.5">Logs</span>
            {unauthorizedCount > 0 && (
              <span className="absolute top-1 right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {unauthorizedCount}
              </span>
            )}
          </button>

          <button
            id="mobile-nav-settings-btn"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-blue-400 active:scale-95 transition min-w-[56px]"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Settings</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <FaceEnrollmentModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        prefs={prefs}
        onSaveBaseline={handleSaveBaseline}
        onClearBaseline={handleClearBaseline}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        prefs={prefs}
        onResendAlert={handleResendAlert}
        isResending={isResendingId === selectedEvent?.id}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        prefs={prefs}
        onSave={(updated) => {
          const newPrefs = SecurityStorage.savePrefs(updated);
          setPrefs(newPrefs);
          setQuickOwnerEmail(newPrefs.ownerEmail);
          setQuickRecipientEmail(newPrefs.alertRecipientEmail);
          setQuickApiKey(newPrefs.sendGridApiKey);
        }}
      />
    </div>
  );
}
