// SafeGuard Shield - Background Sentinel & Audio Keep-Alive Engine

type OwnerStateListener = (isOwnerActive: boolean, remainingSeconds: number) => void;
type PendingAlertListener = (info: { eventId: number; remainingSeconds: number; eventType: string } | null) => void;

interface PendingAlert {
  eventId: number;
  eventType: string;
  remainingSeconds: number;
  timerId: any;
  onExecute: () => Promise<void> | void;
}

// Inaudible continuous PCM WAV loop
const SILENT_PCM_WAV =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';

class BackgroundSentinelService {
  private isVigilant = false;
  private wakeLockSentinel: any = null;
  private audioContext: AudioContext | null = null;
  private silentAudioEl: HTMLAudioElement | null = null;
  private worker: Worker | null = null;
  private pausedUntil: number = 0; // Explicit user pause (e.g. "Pause Alarms 10m")
  private ownerListeners: Set<OwnerStateListener> = new Set();
  private pendingAlert: PendingAlert | null = null;
  private pendingAlertListeners: Set<PendingAlertListener> = new Set();
  private intervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initServiceWorker();
      this.initSilentAudioElement();
    }
  }

  // Register PWA Service Worker for background sync & notifications
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

  private initSilentAudioElement() {
    if (typeof document === 'undefined') return;
    if (!this.silentAudioEl) {
      this.silentAudioEl = document.createElement('audio');
      this.silentAudioEl.setAttribute('playsinline', 'true');
      this.silentAudioEl.setAttribute('webkit-playsinline', 'true');
      this.silentAudioEl.setAttribute('muted', '');
      this.silentAudioEl.loop = true;
      this.silentAudioEl.volume = 0.01;
      this.silentAudioEl.src = SILENT_PCM_WAV;
      this.silentAudioEl.style.position = 'fixed';
      this.silentAudioEl.style.width = '1px';
      this.silentAudioEl.style.height = '1px';
      this.silentAudioEl.style.opacity = '0.01';
      this.silentAudioEl.style.pointerEvents = 'none';
      document.body.appendChild(this.silentAudioEl);
    }
  }

  // --- 1. BACKGROUND VIGILANCE MANAGEMENT ---

  public async startBackgroundVigilance() {
    if (this.isVigilant) return;
    this.isVigilant = true;

    // A. Request Screen / System WakeLock
    await this.acquireWakeLock();

    // B. Start continuous audio keep-alive to hold active mobile background execution
    this.startAudioHeartbeat();

    // C. Spawn inline Web Worker ticker (immune to tab throttling)
    this.startWorkerTicker();

    // D. Attach visibilitychange handler to re-acquire wake lock & audio on resume
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
      if (this.isVigilant) {
        if (!this.wakeLockSentinel) {
          this.acquireWakeLock();
        }
        this.startAudioHeartbeat();
      }
    }
  };

  // Continuous looping audio to keep mobile background execution active
  public startAudioHeartbeat() {
    if (typeof window === 'undefined') return;

    // 1. Play looping audio element
    if (this.silentAudioEl) {
      this.silentAudioEl.play().catch(() => {});
    }

    // 2. Setup MediaSession so Android/iOS grants foreground audio priority
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'SafeGuard Anti-Theft Guard',
          artist: 'Armed & Vigilant',
          album: 'Intruder Detection Active',
        });
        navigator.mediaSession.playbackState = 'playing';

        navigator.mediaSession.setActionHandler('play', () => {
          this.silentAudioEl?.play().catch(() => {});
        });
      } catch {
        // ignore
      }
    }

    // 3. Web Audio API continuous buffer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      }
    } catch (e) {
      console.log('[SafeGuard Audio KeepAlive Notice]', e);
    }
  }

  private stopAudioHeartbeat() {
    if (this.silentAudioEl) {
      try {
        this.silentAudioEl.pause();
      } catch {
        // ignore
      }
    }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // ignore
      }
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
    if (this.worker || typeof window === 'undefined') return;

    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timer) {
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 1000);
            }
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
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

  // --- 2. OWNER TEMPORARY PAUSE (MANUAL EXPLICIT PAUSE ONLY) ---

  public pauseMonitoring(durationMinutes: number = 10) {
    this.pausedUntil = Date.now() + durationMinutes * 60 * 1000;
    this.notifyOwnerState();
    this.cancelPendingIntruderAlert();
  }

  public resumeMonitoring() {
    this.pausedUntil = 0;
    this.notifyOwnerState();
  }

  public setOwnerActive(durationMinutes: number = 10) {
    this.pauseMonitoring(durationMinutes);
  }

  public clearOwnerSession() {
    this.resumeMonitoring();
  }

  public isOwnerActive(): boolean {
    return Date.now() < this.pausedUntil;
  }

  public getRemainingOwnerSeconds(): number {
    if (!this.isOwnerActive()) return 0;
    return Math.max(0, Math.round((this.pausedUntil - Date.now()) / 1000));
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

  // --- 3. INTRUDER ALERT DISPATCH & GRACE COUNTDOWN ---

  public scheduleIntruderEmail(
    eventId: number,
    eventType: string,
    countdownSeconds: number,
    onExecute: () => Promise<void> | void
  ): () => void {
    // Cancel any previous pending alert
    this.cancelPendingIntruderAlert();

    if (countdownSeconds <= 0) {
      // Immediate execution without delay
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
