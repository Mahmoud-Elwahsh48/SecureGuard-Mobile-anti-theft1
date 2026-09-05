// SafeGuard Shield - Background Sentinel & Owner Protection Engine

type OwnerStateListener = (isOwnerActive: boolean, remainingSeconds: number) => void;
type PendingAlertListener = (info: { eventId: number; remainingSeconds: number; eventType: string } | null) => void;

interface PendingAlert {
  eventId: number;
  eventType: string;
  remainingSeconds: number;
  timerId: any;
  onExecute: () => Promise<void> | void;
}

class BackgroundSentinelService {
  private isVigilant = false;
  private wakeLockSentinel: any = null;
  private audioContext: AudioContext | null = null;
  private audioInterval: any = null;
  private worker: Worker | null = null;
  private ownerActiveUntil: number = 0;
  private ownerListeners: Set<OwnerStateListener> = new Set();
  private pendingAlert: PendingAlert | null = null;
  private pendingAlertListeners: Set<PendingAlertListener> = new Set();
  private intervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initServiceWorker();
      this.setupOwnerPresenceTracking();
    }
  }

  // Register PWA Service Worker for background sync & push notifications
  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[SafeGuard SW Registered]', registration.scope);
      } catch (err) {
        console.log('[SafeGuard SW Notice]', err);
      }
    }
  }

  // --- 1. BACKGROUND VIGILANCE MANAGEMENT ---

  public async startBackgroundVigilance() {
    if (this.isVigilant) return;
    this.isVigilant = true;

    // A. Request Screen / System WakeLock
    await this.acquireWakeLock();

    // B. Start inaudible audio heartbeat to keep mobile OS worker threads alive in background
    this.startAudioHeartbeat();

    // C. Spawn inline Web Worker ticker
    this.startWorkerTicker();

    // D. Attach visibilitychange handler to re-acquire wake lock on resume
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public stopBackgroundVigilance() {
    this.isVigilant = false;
    this.releaseWakeLock();
    this.stopAudioHeartbeat();
    this.stopWorkerTicker();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public isVigilanceActive(): boolean {
    return this.isVigilant;
  }

  // Acquire Screen WakeLock
  private async acquireWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const navAny = navigator as any;
        this.wakeLockSentinel = await navAny.wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
          // If still vigilant and page becomes visible, re-acquire
          if (this.isVigilant && typeof document !== 'undefined' && document.visibilityState === 'visible') {
            setTimeout(() => this.acquireWakeLock(), 1000);
          }
        });
        console.log('[SafeGuard WakeLock Acquired]');
      } catch (err) {
        console.log('[SafeGuard WakeLock Notice]', err);
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (this.isVigilant && !this.wakeLockSentinel) {
        this.acquireWakeLock();
      }
    }
  };

  // Inaudible audio heartbeat to keep mobile background execution active
  private startAudioHeartbeat() {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      // Unlock on mobile user gesture
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      // Inaudible 10Hz buffer oscillator every 15s to keep background alive
      if (!this.audioInterval) {
        this.audioInterval = setInterval(() => {
          if (!this.audioContext || this.audioContext.state === 'closed') return;
          try {
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume().catch(() => {});
            }
            // Tiny 1-sample silent node
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            gain.gain.value = 0.00001; // Silent / Inaudible
            osc.frequency.value = 20;
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.05);
          } catch {
            // ignore
          }
        }, 15000);
      }
    } catch (e) {
      console.log('[SafeGuard Audio KeepAlive Notice]', e);
    }
  }

  private stopAudioHeartbeat() {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
  }

  // Background Web Worker Ticker (immune to tab throttling)
  private startWorkerTicker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined' || this.worker) return;

    try {
      const workerCode = `
        let interval = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!interval) {
              interval = setInterval(function() {
                self.postMessage('tick');
              }, 1000);
            }
          } else if (e.data === 'stop') {
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(blobUrl);

      this.worker.onmessage = () => {
        this.onBackgroundTick();
      };

      this.worker.postMessage('start');
    } catch (e) {
      console.log('[SafeGuard Worker Notice]', e);
      // Fallback to standard setInterval
      if (!this.intervalTimer) {
        this.intervalTimer = setInterval(() => this.onBackgroundTick(), 1000);
      }
    }
  }

  private stopWorkerTicker() {
    if (this.worker) {
      try {
        this.worker.postMessage('stop');
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private onBackgroundTick() {
    // Check pending intruder alert countdown
    if (this.pendingAlert) {
      this.pendingAlert.remainingSeconds -= 1;
      this.notifyPendingAlert();

      if (this.pendingAlert.remainingSeconds <= 0) {
        const executeFn = this.pendingAlert.onExecute;
        this.pendingAlert = null;
        this.notifyPendingAlert();
        try {
          executeFn();
        } catch (err) {
          console.error('[SafeGuard Alert Execution Error]', err);
        }
      }
    }

    // Check owner session countdown
    this.notifyOwnerState();
  }

  // --- 2. OWNER IN-USE & MOBILE USAGE PROTECTION ---

  private setupOwnerPresenceTracking() {
    // Interacting with the device resets/extends owner session if already active
    const handleOwnerInteraction = () => {
      if (this.isOwnerActive()) {
        // Extend session by 2 minutes on user interaction
        this.ownerActiveUntil = Math.max(this.ownerActiveUntil, Date.now() + 2 * 60 * 1000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', handleOwnerInteraction, { passive: true });
      window.addEventListener('mousedown', handleOwnerInteraction, { passive: true });
      window.addEventListener('keydown', handleOwnerInteraction, { passive: true });
    }
  }

  public setOwnerActive(durationMinutes: number = 10) {
    this.ownerActiveUntil = Date.now() + durationMinutes * 60 * 1000;
    this.notifyOwnerState();

    // If an alert was counting down, cancel it immediately because owner is present!
    this.cancelPendingIntruderAlert();
  }

  public clearOwnerSession() {
    this.ownerActiveUntil = 0;
    this.notifyOwnerState();
  }

  public isOwnerActive(): boolean {
    return Date.now() < this.ownerActiveUntil;
  }

  public getRemainingOwnerSeconds(): number {
    if (!this.isOwnerActive()) return 0;
    return Math.max(0, Math.round((this.ownerActiveUntil - Date.now()) / 1000));
  }

  public subscribeOwnerState(listener: OwnerStateListener): () => void {
    this.ownerListeners.add(listener);
    listener(this.isOwnerActive(), this.getRemainingOwnerSeconds());
    return () => this.ownerListeners.delete(listener);
  }

  private notifyOwnerState() {
    const active = this.isOwnerActive();
    const remaining = this.getRemainingOwnerSeconds();
    this.ownerListeners.forEach((fn) => {
      try {
        fn(active, remaining);
      } catch (e) {
        console.error(e);
      }
    });
  }

  // --- 3. INTRUDER ALERT GRACE COUNTDOWN MANAGEMENT ---

  /**
   * Schedules an alert email with a countdown.
   * If the owner is using the device and enters their PIN or confirms presence,
   * cancelPendingIntruderAlert() immediately halts the email dispatch.
   */
  public scheduleIntruderEmail(
    eventId: number,
    eventType: string,
    countdownSeconds: number,
    onExecute: () => Promise<void> | void
  ): () => void {
    // If owner is active right now, do NOT schedule intruder email!
    if (this.isOwnerActive()) {
      console.log('[SafeGuard Owner In-Use: Suppressing Intruder Email]');
      return () => {};
    }

    // Cancel any previous pending alert
    this.cancelPendingIntruderAlert();

    if (countdownSeconds <= 0) {
      // Immediate execution
      try {
        onExecute();
      } catch (err) {
        console.error(err);
      }
      return () => {};
    }

    this.pendingAlert = {
      eventId,
      eventType,
      remainingSeconds: countdownSeconds,
      timerId: null,
      onExecute,
    };

    this.notifyPendingAlert();
    return () => this.cancelPendingIntruderAlert();
  }

  public cancelPendingIntruderAlert(): boolean {
    if (this.pendingAlert) {
      console.log(`[SafeGuard Alert Cancelled for Event #${this.pendingAlert.eventId}]`);
      this.pendingAlert = null;
      this.notifyPendingAlert();
      return true;
    }
    return false;
  }

  public getPendingAlertInfo(): { eventId: number; remainingSeconds: number; eventType: string } | null {
    if (!this.pendingAlert) return null;
    return {
      eventId: this.pendingAlert.eventId,
      eventType: this.pendingAlert.eventType,
      remainingSeconds: this.pendingAlert.remainingSeconds,
    };
  }

  public subscribePendingAlert(listener: PendingAlertListener): () => void {
    this.pendingAlertListeners.add(listener);
    listener(this.getPendingAlertInfo());
    return () => this.pendingAlertListeners.delete(listener);
  }

  private notifyPendingAlert() {
    const info = this.getPendingAlertInfo();
    this.pendingAlertListeners.forEach((fn) => {
      try {
        fn(info);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const BackgroundSentinel = new BackgroundSentinelService();
