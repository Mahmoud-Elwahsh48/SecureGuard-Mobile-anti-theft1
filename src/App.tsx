import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Bell,
  Radio,
  Lock,
  Unlock,
  CheckCircle,
  Zap,
  Sliders,
  KeyRound,
} from 'lucide-react';
import { SecurityEvent, SecurityPrefsState, DeviceTelemetryData } from './types';
import { SecurityStorage } from './utils/securityStorage';
import { DeviceTelemetry } from './utils/telemetry';
import { FaceVerification } from './utils/faceVerification';
import { AlertDispatcher } from './utils/alertDispatcher';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TriggerSimulator } from './components/TriggerSimulator';
import { SecurityEventsList } from './components/SecurityEventsList';
import { FaceEnrollmentModal } from './components/FaceEnrollmentModal';
import { EventDetailModal } from './components/EventDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { PinLockModal } from './components/PinLockModal';
import { CameraStealthManager } from './components/CameraStealthManager';
import { CameraManager } from './utils/cameraManager';
import { DevicePermissionsModal } from './components/DevicePermissionsModal';
import { DevicePermissionsBanner } from './components/DevicePermissionsBanner';
import { PermissionManager, AppPermissionsState } from './utils/permissionManager';
import { FigureCaptureAlertModal } from './components/FigureCaptureAlertModal';
import { DynamicTriggerService } from './utils/dynamicTriggerService';
import { BackgroundSentinel } from './utils/backgroundSentinel';
import { OwnerInUseBanner } from './components/OwnerInUseBanner';
import { StealthLockModal } from './components/StealthLockModal';

export function App() {
  const [prefs, setPrefs] = useState<SecurityPrefsState>(SecurityStorage.getPrefs());
  const [events, setEvents] = useState<SecurityEvent[]>(SecurityStorage.getAllEvents());
  const [telemetry, setTelemetry] = useState<DeviceTelemetryData | null>(null);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [isProcessingTrigger, setIsProcessingTrigger] = useState(false);
  const [permissionsState, setPermissionsState] = useState<AppPermissionsState>(PermissionManager.getState());
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isStealthLockOpen, setIsStealthLockOpen] = useState(false);
  const [figureAlertEvent, setFigureAlertEvent] = useState<SecurityEvent | null>(null);
  const [isFigureModalOpen, setIsFigureModalOpen] = useState(false);
  const [isOwnerActive, setIsOwnerActive] = useState(BackgroundSentinel.isOwnerActive());
  const [remainingOwnerSeconds, setRemainingOwnerSeconds] = useState(BackgroundSentinel.getRemainingOwnerSeconds());
  const [pendingAlert, setPendingAlert] = useState<{ eventId: number; remainingSeconds: number; eventType: string } | null>(null);
  const [lastTriggerResult, setLastTriggerResult] = useState<{
    eventType: string;
    isMatch: boolean;
    message: string;
    timestamp: number;
    photoPath?: string;
    personDetected?: boolean;
  } | null>(null);

  // Mobile active tab view ('shield' | 'triggers' | 'telemetry' | 'logs')
  const [activeTab, setActiveTab] = useState<'shield' | 'triggers' | 'telemetry' | 'logs'>('shield');

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    | ((
        faceMode?: string
      ) => Promise<{
        photoDataUrl?: string;
        embedding: number[];
        personDetected?: boolean;
        error?: string;
      }>)
    | null
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
    const unsub = DeviceTelemetry.subscribe((data) => {
      setTelemetry(data);
    });
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refreshTelemetry]);

  // Keep Background Sentinel vigilance synced with monitoring & settings
  useEffect(() => {
    if (prefs.isMonitoring && (prefs.runInBackground ?? true)) {
      BackgroundSentinel.startBackgroundVigilance();
    } else {
      BackgroundSentinel.stopBackgroundVigilance();
    }
  }, [prefs.isMonitoring, prefs.runInBackground]);

  // Subscribe to Owner Active State & Pending Intruder Countdown
  useEffect(() => {
    const unsubOwner = BackgroundSentinel.subscribeOwnerState((active, remaining) => {
      setIsOwnerActive(active);
      setRemainingOwnerSeconds(remaining);
    });
    const unsubAlert = BackgroundSentinel.subscribePendingAlert((info) => {
      setPendingAlert(info);
    });
    return () => {
      unsubOwner();
      unsubAlert();
    };
  }, []);

  // Proactively check all permissions and require them when running on device
  useEffect(() => {
    const unsub = PermissionManager.subscribe((st) => {
      setPermissionsState(st);
    });

    PermissionManager.checkAllPermissions().then((st) => {
      setPermissionsState(st);
      // Require permissions: if any required permission is not active on startup, prompt user
      if (!st.allActive) {
        setIsPermissionsModalOpen(true);
      }
    });

    return unsub;
  }, []);

  // Handle Quick Save & Enable Monitoring from Main View
  const handleQuickEnableMonitoring = () => {
    const updated = SecurityStorage.savePrefs({
      ownerEmail: quickOwnerEmail.trim(),
      alertRecipientEmail: quickRecipientEmail.trim(),
      sendGridApiKey: quickApiKey.trim(),
      isMonitoring: true,
    });
    setPrefs(updated);
    setQuickSavedToast('Monitoring armed & preferences saved!');
    setTimeout(() => setQuickSavedToast(null), 3000);
  };

  // PIN Security Modal State
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    mode: 'unlock_app' | 'verify_action' | 'change_pin';
    title?: string;
    description?: string;
    canCancel?: boolean;
    onSuccess?: () => void;
  }>({
    isOpen: false,
    mode: 'unlock_app',
  });

  // Real-time HUD Security Notification alert banner
  const [hudNotification, setHudNotification] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const triggerHudNotification = (title: string, body: string) => {
    setHudNotification({ title, body });
    setTimeout(() => {
      setHudNotification((cur) => (cur?.title === title ? null : cur));
    }, 4500);
  };

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string }>;
      if (customEvent.detail) {
        setHudNotification(customEvent.detail);
        setTimeout(() => {
          setHudNotification((cur) => (cur?.title === customEvent.detail.title ? null : cur));
        }, 4500);
      }
    };

    window.addEventListener('safeguard:notification', handleNotification);
    return () => {
      window.removeEventListener('safeguard:notification', handleNotification);
    };
  }, []);

  // Handle Disarm requiring 4-digit PIN verification
  const handleToggleMonitoring = () => {
    // If armed and requirePinToDisarm is enabled, require PIN to disarm
    if (prefs.isMonitoring && prefs.requirePinToDisarm) {
      setPinModalConfig({
        isOpen: true,
        mode: 'verify_action',
        title: 'Disarm SafeGuard Shield',
        description: 'Enter your 4-digit security password to disarm monitoring',
        canCancel: true,
        onSuccess: () => {
          const updated = SecurityStorage.savePrefs({ isMonitoring: false });
          setPrefs(updated);
          setPinModalConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    // Otherwise toggle directly
    const updated = SecurityStorage.savePrefs({
      isMonitoring: !prefs.isMonitoring,
    });
    setPrefs(updated);
  };

  const handleLockApp = () => {
    BackgroundSentinel.clearOwnerSession();
    setPinModalConfig({
      isOpen: true,
      mode: 'unlock_app',
      title: 'SafeGuard Shield Locked',
      description: 'Enter 4-digit security password to access application',
      canCancel: false,
      onSuccess: () => {
        setPinModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Owner In-Use Actions
  const handleActivateOwnerMode = () => {
    setPinModalConfig({
      isOpen: true,
      mode: 'verify_action',
      title: 'Confirm Owner Presence',
      description: 'Enter 4-digit security password to activate Owner Safe Mode',
      canCancel: true,
      onSuccess: () => {
        BackgroundSentinel.setOwnerActive(prefs.ownerSessionGraceMinutes || 10);
        setPinModalConfig((prev) => ({ ...prev, isOpen: false }));
        triggerHudNotification(
          'Owner Safe Mode Activated',
          `Intruder alerts paused for ${prefs.ownerSessionGraceMinutes || 10}m while using your mobile.`
        );
      },
    });
  };

  const handleLockOwnerMode = () => {
    BackgroundSentinel.clearOwnerSession();
    triggerHudNotification(
      'Background Vigilance Armed',
      'Device armed for intruder detection. Hardware triggers will capture unauthorized figures.'
    );
  };

  const handleCancelPendingAlert = () => {
    const cancelled = BackgroundSentinel.cancelPendingIntruderAlert();
    if (cancelled) {
      BackgroundSentinel.setOwnerActive(prefs.ownerSessionGraceMinutes || 10);
      setIsFigureModalOpen(false);
      triggerHudNotification(
        'Intruder Alert Cancelled',
        'Owner presence confirmed. Email alert dispatch stopped.'
      );
    }
  };

  const handleOpenChangePin = () => {
    setPinModalConfig({
      isOpen: true,
      mode: 'change_pin',
      title: 'Change 4-Digit Security Password',
      description: 'Configure your 4 numbers passcode',
      canCancel: true,
      onSuccess: () => {
        setPinModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handlePinChanged = (newPin: string) => {
    const updated = SecurityStorage.savePrefs({ securityPin: newPin });
    setPrefs(updated);
    setQuickSavedToast('New 4-digit security password saved!');
    setTimeout(() => setQuickSavedToast(null), 3000);
  };

  const handlePinFailedAttempt = async (attemptCount: number) => {
    if (attemptCount >= 3) {
      // 3 failed passcode attempts - capture photo and log incident
      try {
        let photoDataUrl: string | undefined = undefined;
        if (stealthCaptureRef.current) {
          const capture = await stealthCaptureRef.current('camera');
          photoDataUrl = capture.photoDataUrl;
        }

        const currentTelemetry = await DeviceTelemetry.collectFullTelemetry();
        const breachEvent = SecurityStorage.insertEvent({
          eventType: 'Failed Passcode - 3 Invalid PIN Attempts',
          timestamp: Date.now(),
          message: 'Unauthorized intruder suspected attempting 4-digit PIN bypass',
          photoPath: photoDataUrl,
          latitude: currentTelemetry.latitude,
          longitude: currentTelemetry.longitude,
          altitude: currentTelemetry.altitude,
          accuracy: currentTelemetry.accuracy,
          locationAddress: currentTelemetry.locationAddress,
          batteryLevel: currentTelemetry.batteryLevel,
          networkState: currentTelemetry.networkState,
          ipAddress: currentTelemetry.ipAddress,
          status: 'pending',
          deviceInfo: currentTelemetry.deviceModel,
        });

        setEvents(SecurityStorage.getAllEvents());
        if (prefs.soundAlert) {
          playAlertChime(true);
        }

        // Dispatch alert email
        const dispatchResult = await AlertDispatcher.dispatchAlert(breachEvent, prefs);
        if (dispatchResult.success) {
          SecurityStorage.updateEventStatus(breachEvent.id, 'sent');
        } else {
          SecurityStorage.updateEventStatus(breachEvent.id, 'failed', dispatchResult.message);
        }
        setEvents(SecurityStorage.getAllEvents());
      } catch (e) {
        console.error('Failed to log failed PIN breach', e);
      }
    }
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

  const handleRegisterStealthCapture = useCallback((fn: any) => {
    stealthCaptureRef.current = fn;
  }, []);

  // Execute Security Monitoring Trigger
  const handleFireTrigger = async (triggerName: string) => {
    if (isProcessingTrigger) {
      return;
    }

    // 0. OWNER EXPLICIT PAUSE CHECK
    // Only pause if owner explicitly pressed "Pause (10m)" in the UI
    if (BackgroundSentinel.isOwnerActive()) {
      console.log(`[SafeGuard] Monitoring explicitly paused by owner. Skipping: ${triggerName}`);
      return;
    }

    // If security monitoring is disarmed, automatically arm it for this trigger
    if (!prefs.isMonitoring) {
      const updatedPrefs = { ...prefs, isMonitoring: true };
      setPrefs(updatedPrefs);
      SecurityStorage.savePrefs(updatedPrefs);
    }

    setIsProcessingTrigger(true);

    try {
      // 1. Capture real optical figure directly from device camera with permissions
      let photoDataUrl: string | undefined = undefined;
      let candidateEmbedding: number[] = [];
      let personDetected: boolean | undefined = undefined;

      try {
        // Direct real frame capture with non-blocking timeout safeguard (<500ms)
        const realCapture = await Promise.race([
          CameraManager.captureRealFigure(null, triggerName),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
        ]);
        if (realCapture && realCapture.photoDataUrl) {
          photoDataUrl = realCapture.photoDataUrl;
          candidateEmbedding = realCapture.embedding;
          personDetected = realCapture.personDetected ?? true;
        } else if (stealthCaptureRef.current) {
          const stealthRes = await Promise.race([
            stealthCaptureRef.current(triggerName),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
          ]);
          if (stealthRes && stealthRes.photoDataUrl) {
            photoDataUrl = stealthRes.photoDataUrl;
            candidateEmbedding = stealthRes.embedding;
            personDetected = stealthRes.personDetected ?? true;
          }
        }
      } catch (captureErr) {
        console.warn('Real camera capture notice:', captureErr);
      }

      // 2. Perform Face Verification & Biometric Evaluation against real owner baseline
      let isOwner = false;
      if (prefs.ownerFaceEmbedding && candidateEmbedding.length > 0) {
        const matchResult = FaceVerification.verifyMatch(
          candidateEmbedding,
          prefs.ownerFaceEmbedding
        );
        isOwner = matchResult.isMatch;
      } else if (!prefs.ownerFaceEmbedding) {
        // If owner hasn't enrolled face ID yet, treat as unauthorized / un-enrolled
        isOwner = false;
      }

      let finalEventType = triggerName;
      let message = 'Security condition detected';

      if (isOwner) {
        finalEventType = triggerName;
        message = 'Security trigger fired - Authorized owner face verified';
        // Owner recognized: activate owner safe mode!
        BackgroundSentinel.setOwnerActive(prefs.ownerSessionGraceMinutes || 10);
      } else if (prefs.ownerFaceEmbedding) {
        finalEventType = `${triggerName} - Unrecognized Subject`;
        message = 'Unauthorized subject detected by camera';
      } else {
        finalEventType = `${triggerName} - No Face Enrolled`;
        message = 'Security trigger fired (Owner Face ID not yet enrolled)';
      }

      // 3. Collect fast telemetry snapshot (<300ms race timeout)
      const currentTelemetry = await Promise.race([
        DeviceTelemetry.collectFastTelemetry(telemetry),
        new Promise<typeof telemetry>((resolve) => setTimeout(() => resolve(telemetry), 300)),
      ]);
      setTelemetry(currentTelemetry);

      // 4. Create Security Event in DB
      const newEvent = SecurityStorage.insertEvent({
        eventType: finalEventType,
        timestamp: Date.now(),
        message,
        photoPath: photoDataUrl,
        latitude: currentTelemetry?.latitude,
        longitude: currentTelemetry?.longitude,
        altitude: currentTelemetry?.altitude,
        accuracy: currentTelemetry?.accuracy,
        locationAddress: currentTelemetry?.locationAddress,
        batteryLevel: currentTelemetry?.batteryLevel,
        networkState: currentTelemetry?.networkState,
        ipAddress: currentTelemetry?.ipAddress,
        status: isOwner ? 'authorized' : 'pending',
        deviceInfo: currentTelemetry?.deviceModel,
        personDetected: personDetected ?? (photoDataUrl ? true : null),
        figureDescription: photoDataUrl
          ? 'Real optical figure captured via device camera'
          : 'Camera permission required to capture figure',
      });

      setEvents(SecurityStorage.getAllEvents());

      setLastTriggerResult({
        eventType: finalEventType,
        isMatch: isOwner,
        message,
        timestamp: Date.now(),
        photoPath: photoDataUrl,
        personDetected,
      });

      // Show Captured Figure Alert Modal immediately
      setFigureAlertEvent(newEvent);
      setIsFigureModalOpen(true);

      if (prefs.soundAlert) {
        playAlertChime(!isOwner);
      }

      // 5. If Unauthorized or Telemetry Breach: Dispatch alert email to configured address
      if (!isOwner) {
        PermissionManager.notifyUser(
          '🚨 Security Breach Detected - SafeGuard Shield',
          `Unauthorized figure captured during ${triggerName}. Alert email dispatching.`
        );

        // Immediate dispatch to send intruder email before OS can suspend network or process
        AlertDispatcher.dispatchAlert(newEvent, prefs)
          .then((dispatchResult) => {
            console.log('[SafeGuard Alert Dispatched]', dispatchResult);
            if (dispatchResult.success) {
              SecurityStorage.updateEventStatus(newEvent.id, 'sent');
            } else {
              SecurityStorage.updateEventStatus(newEvent.id, 'failed', dispatchResult.message);
            }
            setEvents(SecurityStorage.getAllEvents());
          })
          .catch((dispatchErr) => {
            console.warn('Background alert dispatch notice:', dispatchErr);
          });
      }
    } catch (err) {
      console.error('Trigger monitoring failed', err);
    } finally {
      setIsProcessingTrigger(false);
    }
  };

  // Wire up Dynamic Hardware Trigger Service
  const handleFireTriggerRef = useRef<(triggerName: string) => Promise<void>>(handleFireTrigger);
  useEffect(() => {
    handleFireTriggerRef.current = handleFireTrigger;
  });

  useEffect(() => {
    DynamicTriggerService.setMonitoring(prefs.isMonitoring);
    if (prefs.isMonitoring) {
      BackgroundSentinel.startBackgroundVigilance();
    } else {
      BackgroundSentinel.stopBackgroundVigilance();
    }
    DynamicTriggerService.setTriggerCallback(async (triggerName, details) => {
      console.log('[SafeGuard Dynamic Trigger Activated]', triggerName, details);
      if (handleFireTriggerRef.current) {
        await handleFireTriggerRef.current(triggerName);
      }
    });
  }, [prefs.isMonitoring]);

  // Flush any queued offline intruder emails whenever network connectivity returns
  useEffect(() => {
    const handleOnline = () => {
      AlertDispatcher.flushOfflineQueue(prefs);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [prefs]);

  // Ensure audio keep-alive context is unlocked on first user touch/interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      if (prefs.isMonitoring) {
        BackgroundSentinel.startBackgroundVigilance();
      }
    };
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });
  }, [prefs.isMonitoring]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-24 md:pb-10">
      {/* Background Stealth Camera Manager */}
      <CameraStealthManager onRegisterCaptureFunction={handleRegisterStealthCapture} />

      {/* Real-time Security Notification Toast HUD */}
      {hudNotification && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce-short">
          <div className="flex items-center space-x-3 rounded-2xl border border-blue-500/50 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-white">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  SafeGuard Notification
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
              </div>
              <h5 className="text-xs sm:text-sm font-bold truncate text-white">
                {hudNotification.title}
              </h5>
              <p className="text-[11px] text-slate-300 truncate">
                {hudNotification.body}
              </p>
            </div>
            <button
              onClick={() => setHudNotification(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        prefs={prefs}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        unauthorizedCount={unauthorizedCount}
        onLockApp={handleLockApp}
        permissions={permissionsState}
        onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
        onToggleMonitoring={handleToggleMonitoring}
      />

      {/* Control Panel Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        prefs={prefs}
        onToggleMonitoring={handleToggleMonitoring}
        onOpenEnrollFace={() => setIsFaceModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenChangePin={handleOpenChangePin}
        onLockApp={handleLockApp}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
        permissions={permissionsState}
        onRefreshTelemetry={refreshTelemetry}
        isRefreshing={isRefreshingTelemetry}
        unauthorizedCount={unauthorizedCount}
        totalEventsCount={events.length}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* 4 Core Features Selector in Two Rows */}
      <div className="sticky top-[49px] sm:top-[57px] z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Row 1 & Row 2 Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Row 1, Item 1: Shield */}
            <button
              id="tab-shield-btn"
              onClick={() => setActiveTab('shield')}
              className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 border ${
                activeTab === 'shield'
                  ? 'bg-blue-600/20 border-blue-500/80 text-white shadow-sm ring-1 ring-blue-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${activeTab === 'shield' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold">Shield</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${prefs.isMonitoring ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {prefs.isMonitoring ? 'ARMED' : 'OFF'}
              </span>
            </button>

            {/* Row 1, Item 2: Triggers */}
            <button
              id="tab-triggers-btn"
              onClick={() => setActiveTab('triggers')}
              className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 border ${
                activeTab === 'triggers'
                  ? 'bg-amber-600/20 border-amber-500/80 text-white shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${activeTab === 'triggers' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold">Triggers</span>
              </div>
              <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
                6 PROBES
              </span>
            </button>

            {/* Row 2, Item 1: GPS & Telemetry */}
            <button
              id="tab-telemetry-btn"
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 border ${
                activeTab === 'telemetry'
                  ? 'bg-emerald-600/20 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${activeTab === 'telemetry' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <Radio className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold truncate">GPS & Telemetry</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                LIVE
              </span>
            </button>

            {/* Row 2, Item 2: Incidents */}
            <button
              id="tab-logs-btn"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 border ${
                activeTab === 'logs'
                  ? 'bg-purple-600/20 border-purple-500/80 text-white shadow-sm ring-1 ring-purple-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${activeTab === 'logs' ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-400'}`}>
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold truncate">Incidents</span>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                {events.length} LOGS
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-3.5 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {/* Owner Mobile In-Use Protection & Pending Alert Countdown Banner */}
        <OwnerInUseBanner
          prefs={prefs}
          isOwnerActive={isOwnerActive}
          remainingOwnerSeconds={remainingOwnerSeconds}
          onActivateOwnerMode={handleActivateOwnerMode}
          onLockOwnerMode={handleLockOwnerMode}
          pendingAlert={pendingAlert}
          onCancelPendingAlert={handleCancelPendingAlert}
          onOpenFaceModal={() => setIsFaceModalOpen(true)}
          onOpenStealthLock={() => setIsStealthLockOpen(true)}
        />

        {/* Device Permissions Required & Active Status Banner */}
        <DevicePermissionsBanner
          permissions={permissionsState}
          onOpenModal={() => setIsPermissionsModalOpen(true)}
        />

        {/* Mobile View: Dynamic Tab rendering | Desktop: Full Dashboard View */}

        {/* 1. Mobile Shield View or Desktop Overview */}
        <section
          id="section-overview"
          className={`space-y-4 sm:space-y-6 ${
            activeTab === 'shield' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Tactical Radar Hero Card */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-4 sm:p-6 shadow-xl backdrop-blur-md">
            {/* Background Radar Graphic */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-blue-500/10 opacity-30 animate-pulse-ring" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              {/* Radar Status Ring */}
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
                <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl border shadow-2xl">
                  <div
                    className={`absolute inset-0 rounded-3xl opacity-20 ${
                      prefs.isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {prefs.isMonitoring ? (
                    <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
                  ) : (
                    <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12 text-amber-400" />
                  )}
                  {prefs.isMonitoring && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                      <span className="text-blue-400 font-black tracking-wider uppercase">SafeGuard</span>
                      <span>Shield</span>
                    </h2>
                    <span
                      className={`hidden xs:inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        prefs.isMonitoring
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {prefs.isMonitoring ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-lg">
                    {prefs.isMonitoring
                      ? 'Real-time sensor monitoring active. Automated front-camera stealth capture & alert dispatch armed.'
                      : 'Intrusion triggers are paused. Tap below to activate complete perimeter security.'}
                  </p>
                </div>
              </div>

              {/* Tactical Actions in Two Rows */}
              <div className="w-full md:w-auto md:min-w-[340px] lg:min-w-[400px]">
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  {/* Row 1, Item 1: Arm/Disarm Protection */}
                  <button
                    id="hero-toggle-monitoring-btn"
                    onClick={handleToggleMonitoring}
                    className={`flex items-center justify-center space-x-2 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 min-h-[48px] ${
                      prefs.isMonitoring
                        ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30 ring-1 ring-emerald-400/30'
                    }`}
                  >
                    {prefs.isMonitoring ? (
                      <>
                        <Unlock className="h-4 w-4 shrink-0" />
                        <span className="truncate">DISARM PROTECTION</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 shrink-0" />
                        <span className="truncate">ARM SYSTEM NOW</span>
                      </>
                    )}
                  </button>

                  {/* Row 1, Item 2: Lock Application */}
                  <button
                    id="hero-lock-app-btn"
                    onClick={handleLockApp}
                    className="flex items-center justify-center space-x-2 rounded-xl sm:rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition active:scale-95 min-h-[48px]"
                  >
                    <Lock className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="truncate">LOCK APP</span>
                  </button>

                  {/* Row 2, Item 1: Enroll Face ID */}
                  <button
                    id="hero-enroll-face-btn"
                    onClick={() => setIsFaceModalOpen(true)}
                    className="flex items-center justify-center space-x-2 rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/90 px-3 sm:px-4 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition active:scale-95 min-h-[48px]"
                  >
                    <UserCheck className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="truncate">
                      {prefs.ownerFaceEmbedding ? 'Face ID Active' : 'Enroll Face ID'}
                    </span>
                  </button>

                  {/* Row 2, Item 2: 4-Digit Security PIN */}
                  <button
                    id="hero-security-pin-btn"
                    onClick={handleOpenChangePin}
                    className="flex items-center justify-center space-x-2 rounded-xl sm:rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 sm:px-4 py-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition active:scale-95 min-h-[48px]"
                  >
                    <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      4-Digit PIN ({prefs.securityPin ? '••••' : '1234'})
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Core Features Grid in Two Rows */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Core Security Modules (2 Rows)
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* Row 1: Shield */}
                <div
                  id="card-feature-shield"
                  onClick={() => setActiveTab('shield')}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 sm:p-3 cursor-pointer hover:border-slate-700 active:scale-95 transition"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${prefs.isMonitoring ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-medium truncate">Shield</span>
                    <span className={`block text-xs font-bold truncate ${prefs.isMonitoring ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {prefs.isMonitoring ? 'Armed & Active' : 'Disarmed'}
                    </span>
                  </div>
                </div>

                {/* Row 1: Triggers */}
                <div
                  id="card-feature-triggers"
                  onClick={() => setActiveTab('triggers')}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 sm:p-3 cursor-pointer hover:border-slate-700 active:scale-95 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-medium truncate">Triggers</span>
                    <span className="block text-xs font-bold text-slate-200 truncate">
                      6 Sensor Probes
                    </span>
                  </div>
                </div>

                {/* Row 2: GPS & Telemetry */}
                <div
                  id="card-feature-telemetry"
                  onClick={() => setActiveTab('telemetry')}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 sm:p-3 cursor-pointer hover:border-slate-700 active:scale-95 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-medium truncate">GPS & Telemetry</span>
                    <span className="block text-xs font-bold text-slate-200 truncate">
                      {telemetry?.latitude != null && telemetry?.longitude != null ? `${telemetry.latitude.toFixed(3)}, ${telemetry.longitude.toFixed(3)}` : 'Live Sensors'}
                    </span>
                  </div>
                </div>

                {/* Row 2: Incidents */}
                <div
                  id="card-feature-incidents"
                  onClick={() => setActiveTab('logs')}
                  className="flex items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 sm:p-3 cursor-pointer hover:border-slate-700 active:scale-95 transition"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 font-medium truncate">Incidents</span>
                    <span className="block text-xs font-bold text-slate-200 truncate">
                      {events.length} Recorded Logs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Configuration Bar */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg backdrop-blur-sm">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Security Credentials & Alert Routing</span>
              <span className="text-[11px] text-slate-500 font-normal">MainActivity Setup</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Owner Email
                </label>
                <input
                  id="main-owner-email-input"
                  type="email"
                  value={quickOwnerEmail}
                  onChange={(e) => setQuickOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Alert Recipient Email
                </label>
                <input
                  id="main-alert-recipient-input"
                  type="email"
                  value={quickRecipientEmail}
                  onChange={(e) => setQuickRecipientEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  SendGrid API Key
                </label>
                <div className="flex space-x-1.5">
                  <input
                    id="main-api-key-input"
                    type="password"
                    value={quickApiKey}
                    onChange={(e) => setQuickApiKey(e.target.value)}
                    placeholder="SG.xxxxx"
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-mono min-h-[40px]"
                  />
                  <button
                    id="main-save-config-btn"
                    onClick={handleQuickEnableMonitoring}
                    className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition active:scale-95 shrink-0 min-h-[40px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            {quickSavedToast && (
              <div className="mt-2.5 flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{quickSavedToast}</span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Triggers Section */}
        <section
          id="section-triggers"
          className={activeTab === 'triggers' ? 'block' : 'hidden md:block'}
        >
          <TriggerSimulator
            prefs={prefs}
            onFireTrigger={handleFireTrigger}
            isProcessing={isProcessingTrigger}
            lastResult={lastTriggerResult}
            permissions={permissionsState}
            onOpenPermissions={() => setIsPermissionsModalOpen(true)}
            onOpenFigureModal={() => {
              const latest = SecurityStorage.getAllEvents()[0];
              if (latest) {
                setFigureAlertEvent(latest);
                setIsFigureModalOpen(true);
              }
            }}
          />
        </section>

        {/* 3. Telemetry & Real-Time Sensors */}
        <section
          id="section-telemetry"
          className={activeTab === 'telemetry' ? 'block' : 'hidden md:block'}
        >
          <TelemetryPanel
            telemetry={telemetry}
            isMonitoring={prefs.isMonitoring}
            onRefresh={refreshTelemetry}
            isRefreshing={isRefreshingTelemetry}
          />
        </section>

        {/* 4. Incident Logs Section */}
        <section
          id="section-logs"
          className={activeTab === 'logs' ? 'block' : 'hidden md:block'}
        >
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
      <nav aria-label="Mobile Navigation Bar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl px-2 py-1 safe-bottom shadow-2xl">
        <div className="flex items-center justify-around">
          <button
            id="mobile-nav-overview-btn"
            onClick={() => setActiveTab('shield')}
            className={`flex flex-col items-center justify-center p-1.5 transition active:scale-95 min-w-[56px] ${
              activeTab === 'shield' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className={`h-5 w-5 ${activeTab === 'shield' ? 'text-blue-400' : ''}`} />
            <span className="text-[10px] mt-0.5">Shield</span>
          </button>

          <button
            id="mobile-nav-triggers-btn"
            onClick={() => setActiveTab('triggers')}
            className={`flex flex-col items-center justify-center p-1.5 transition active:scale-95 min-w-[56px] ${
              activeTab === 'triggers' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Triggers</span>
          </button>

          <button
            id="mobile-nav-telemetry-btn"
            onClick={() => setActiveTab('telemetry')}
            className={`flex flex-col items-center justify-center p-1.5 transition active:scale-95 min-w-[56px] ${
              activeTab === 'telemetry' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Telemetry</span>
          </button>

          <button
            id="mobile-nav-logs-btn"
            onClick={() => setActiveTab('logs')}
            className={`relative flex flex-col items-center justify-center p-1.5 transition active:scale-95 min-w-[56px] ${
              activeTab === 'logs' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Logs</span>
            {unauthorizedCount > 0 && (
              <span className="absolute top-1 right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {unauthorizedCount}
              </span>
            )}
          </button>

          <button
            id="mobile-nav-menu-btn"
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 active:scale-95 transition min-w-[56px]"
          >
            <Sliders className="h-5 w-5 text-blue-400" />
            <span className="text-[10px] mt-0.5">Control</span>
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
        onOpenPinModal={handleOpenChangePin}
        onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
        onSave={(updated) => {
          const newPrefs = SecurityStorage.savePrefs(updated);
          setPrefs(newPrefs);
          setQuickOwnerEmail(newPrefs.ownerEmail);
          setQuickRecipientEmail(newPrefs.alertRecipientEmail);
          setQuickApiKey(newPrefs.sendGridApiKey);
        }}
      />

      {/* Device Permissions Required & Active Status Modal */}
      <DevicePermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        permissions={permissionsState}
        onRefresh={() => PermissionManager.checkAllPermissions()}
      />

      {/* 4-Digit Security Password (PIN) Lock & Verification Modal */}
      <PinLockModal
        isOpen={pinModalConfig.isOpen}
        mode={pinModalConfig.mode}
        title={pinModalConfig.title}
        description={pinModalConfig.description}
        canCancel={pinModalConfig.canCancel}
        currentPin={prefs.securityPin || '1234'}
        onClose={() => setPinModalConfig((p) => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          if (pinModalConfig.onSuccess) {
            pinModalConfig.onSuccess();
          } else {
            setPinModalConfig((p) => ({ ...p, isOpen: false }));
          }
        }}
        onPinChanged={handlePinChanged}
        onFailedAttempt={handlePinFailedAttempt}
      />

      {/* Real-time Dynamic Figure Capture Security Modal */}
      <FigureCaptureAlertModal
        isOpen={isFigureModalOpen}
        event={figureAlertEvent}
        onClose={() => setIsFigureModalOpen(false)}
        onLockApp={() => {
          setIsFigureModalOpen(false);
          handleLockApp();
        }}
        onViewLogs={() => {
          setIsFigureModalOpen(false);
          setActiveTab('logs');
        }}
      />

      {/* Stealth Lock Screen (Simulated Screen Off & Trap for Mobile) */}
      <StealthLockModal
        isOpen={isStealthLockOpen}
        onClose={() => setIsStealthLockOpen(false)}
        onTriggerBreach={(reason) => handleFireTrigger(reason)}
        prefs={prefs}
      />
    </div>
  );
}

