import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { CameraManager } from './cameraManager';
import { DeviceTelemetry } from './telemetry';

export type SinglePermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown' | 'not_supported';

export interface AppPermissionsState {
  camera: {
    status: SinglePermissionStatus;
    isActive: boolean;
    error?: string;
  };
  location: {
    status: SinglePermissionStatus;
    isActive: boolean;
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
    } | null;
    error?: string;
  };
  notifications: {
    status: SinglePermissionStatus;
    isActive: boolean;
    error?: string;
  };
  motion: {
    status: SinglePermissionStatus;
    isActive: boolean;
    error?: string;
  };
  allGranted: boolean;
  allActive: boolean;
}

type PermissionListener = (state: AppPermissionsState) => void;

class PermissionManagerService {
  private state: AppPermissionsState = {
    camera: { status: 'unknown', isActive: false },
    location: { status: 'unknown', isActive: false, coords: null },
    notifications: { status: 'unknown', isActive: false },
    motion: { status: 'unknown', isActive: false },
    allGranted: false,
    allActive: false,
  };

  private listeners: Set<PermissionListener> = new Set();
  private locationWatchId: number | null = null;
  private motionListenerAttached = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkAllPermissions().catch(() => {});
    }
  }

  public subscribe(listener: PermissionListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const allGranted =
      this.state.camera.status === 'granted' &&
      this.state.location.status === 'granted' &&
      (this.state.notifications.status === 'granted' || this.state.notifications.status === 'not_supported');

    const allActive =
      this.state.camera.isActive &&
      this.state.location.isActive &&
      (this.state.notifications.isActive || this.state.notifications.status === 'not_supported');

    this.state = {
      ...this.state,
      allGranted,
      allActive,
    };

    this.listeners.forEach((fn) => fn(this.state));
  }

  public getState(): AppPermissionsState {
    return this.state;
  }

  // --- 1. CAMERA PERMISSION & ACTIVE STREAM ---
  public async checkCamera(): Promise<SinglePermissionStatus> {
    const status = await CameraManager.checkPermission();
    const sharedStream = CameraManager.getSharedStream();
    const isActive = !!(sharedStream && sharedStream.active);

    this.state.camera = {
      status,
      isActive,
      error: status === 'denied' ? 'Camera blocked in settings' : undefined,
    };
    this.notify();
    return status;
  }

  public async requestCamera(): Promise<boolean> {
    try {
      const res = await CameraManager.requestPermission();
      this.state.camera = {
        status: res.granted ? 'granted' : 'denied',
        isActive: res.granted,
        error: res.error,
      };
      this.notify();
      return res.granted;
    } catch (err: any) {
      this.state.camera = {
        status: 'denied',
        isActive: false,
        error: err?.message || 'Failed to request camera',
      };
      this.notify();
      return false;
    }
  }

  // --- 2. GEOLOCATION / GPS PERMISSION & ACTIVE WATCHER ---
  public async checkLocation(): Promise<SinglePermissionStatus> {
    let status: SinglePermissionStatus = 'unknown';

    // Check Capacitor Geolocation ONLY on native mobile
    if (Capacitor.isNativePlatform()) {
      try {
        if (Geolocation && typeof Geolocation.checkPermissions === 'function') {
          const capPerm = await Geolocation.checkPermissions();
          if (capPerm && capPerm.location) {
            if (capPerm.location === 'granted') status = 'granted';
            else if (capPerm.location === 'denied') status = 'denied';
            else if (capPerm.location === 'prompt' || capPerm.location === 'prompt-with-rationale') status = 'prompt';
          }
        }
      } catch {
        // ignore
      }
    }

    // Check Web Permissions API
    if (status === 'unknown' && typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const queryRes = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        status = queryRes.state as SinglePermissionStatus;
        queryRes.onchange = () => {
          this.state.location.status = queryRes.state as SinglePermissionStatus;
          this.notify();
        };
      } catch {
        // query not supported
      }
    }

    const isActive = this.locationWatchId !== null || this.state.location.coords !== null;
    this.state.location.status = status;
    this.state.location.isActive = isActive;
    this.notify();
    return status;
  }

  public async requestLocation(): Promise<boolean> {
    // 1. Try Capacitor native mobile prompt if on native platform
    if (Capacitor.isNativePlatform()) {
      try {
        if (Geolocation && typeof Geolocation.requestPermissions === 'function') {
          await Geolocation.requestPermissions({ permissions: ['location'] });
        }
      } catch {
        // ignore
      }
    }

    // 2. Request through navigator.geolocation
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.state.location = {
        status: 'not_supported',
        isActive: false,
        coords: null,
        error: 'Geolocation API not supported',
      };
      this.notify();
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.state.location = {
            status: 'granted',
            isActive: true,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: Math.round(position.coords.accuracy || 10),
            },
          };
          DeviceTelemetry.updateRealGpsPosition(position.coords).catch(() => {});
          this.startActiveLocationWatcher();
          this.notify();
          resolve(true);
        },
        (err) => {
          const isDenied = err.code === err.PERMISSION_DENIED;
          this.state.location = {
            status: isDenied ? 'denied' : 'prompt',
            isActive: false,
            coords: null,
            error: isDenied
              ? 'Location access was blocked. Please enable Location in browser/mobile settings.'
              : err.message,
          };
          this.notify();
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }

  public startActiveLocationWatcher() {
    if (typeof navigator === 'undefined' || !navigator.geolocation || this.locationWatchId !== null) {
      return;
    }

    try {
      this.locationWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.state.location = {
            status: 'granted',
            isActive: true,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10),
            },
          };
          DeviceTelemetry.updateRealGpsPosition(pos.coords).catch(() => {});
          this.notify();
        },
        (err) => {
          console.warn('Location watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 15000 }
      );
    } catch {
      // ignore
    }
  }

  // --- 3. NOTIFICATIONS PERMISSION & IN-APP ALARM ENGINE ---
  private inAppNotificationsEnabled = true;

  public async checkNotifications(): Promise<SinglePermissionStatus> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = Notification.permission;
        if (perm === 'granted') {
          this.state.notifications = { status: 'granted', isActive: true };
          this.notify();
          return 'granted';
        }
      } catch {
        // ignore
      }
    }

    if (this.inAppNotificationsEnabled) {
      this.state.notifications = { status: 'granted', isActive: true };
      this.notify();
      return 'granted';
    }

    this.state.notifications = { status: 'prompt', isActive: false };
    this.notify();
    return 'prompt';
  }

  public async requestNotifications(): Promise<boolean> {
    this.inAppNotificationsEnabled = true;

    // Try system notification request if in top-level window
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          try {
            new Notification('SafeGuard Shield Active', {
              body: 'Real-time security notifications & stealth triggers are active.',
              icon: '/favicon.ico',
            });
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.log('System Notification prompt bypassed in this context:', err);
      }
    }

    this.state.notifications = {
      status: 'granted',
      isActive: true,
      error: undefined,
    };
    this.notify();

    // Trigger test confirmation alert
    this.notifyUser(
      'Security Notifications Active',
      'Intrusion alerts, camera triggers, and audible chimes are armed.'
    );

    return true;
  }

  // --- 4. MOTION & SENSORS PERMISSION ---
  public async checkMotion(): Promise<SinglePermissionStatus> {
    if (typeof window === 'undefined') return 'not_supported';

    // iOS 13+ requires explicit DeviceMotionEvent permission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DME = (window as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      this.state.motion = {
        status: this.motionListenerAttached ? 'granted' : 'prompt',
        isActive: this.motionListenerAttached,
      };
      this.notify();
      return this.motionListenerAttached ? 'granted' : 'prompt';
    }

    // Modern Android / browsers have it enabled by default
    if ('ondevicemotion' in window) {
      this.attachMotionListener();
      this.state.motion = {
        status: 'granted',
        isActive: true,
      };
      this.notify();
      return 'granted';
    }

    this.state.motion = {
      status: 'not_supported',
      isActive: false,
    };
    this.notify();
    return 'not_supported';
  }

  public async requestMotion(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DME = (window as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      try {
        const response = await DME.requestPermission();
        const granted = response === 'granted';
        if (granted) {
          this.attachMotionListener();
        }
        this.state.motion = {
          status: granted ? 'granted' : 'denied',
          isActive: granted,
        };
        this.notify();
        return granted;
      } catch (err: any) {
        this.state.motion = {
          status: 'denied',
          isActive: false,
          error: err?.message,
        };
        this.notify();
        return false;
      }
    }

    this.attachMotionListener();
    this.state.motion = { status: 'granted', isActive: true };
    this.notify();
    return true;
  }

  private attachMotionListener() {
    if (this.motionListenerAttached || typeof window === 'undefined') return;
    try {
      window.addEventListener(
        'devicemotion',
        () => {
          this.motionListenerAttached = true;
          this.state.motion.isActive = true;
        },
        { passive: true }
      );
      this.motionListenerAttached = true;
    } catch {
      // ignore
    }
  }

  // --- BULK OPERATIONS ---
  public async checkAllPermissions(): Promise<AppPermissionsState> {
    await Promise.all([
      this.checkCamera(),
      this.checkLocation(),
      this.checkNotifications(),
      this.checkMotion(),
    ]);

    // If camera was granted, ensure stream is active
    if (this.state.camera.status === 'granted') {
      CameraManager.ensureLiveStream()
        .then(() => {
          this.state.camera.isActive = true;
          this.notify();
        })
        .catch(() => {});
    }

    // If location was granted, ensure location watcher is active
    if (this.state.location.status === 'granted') {
      this.startActiveLocationWatcher();
    }

    return this.state;
  }

  public async requestAllPermissions(): Promise<{
    camera: boolean;
    location: boolean;
    notifications: boolean;
    motion: boolean;
  }> {
    // 1. Camera (Must be requested)
    const cameraGranted = await this.requestCamera();

    // 2. Geolocation (Must be requested)
    const locationGranted = await this.requestLocation();

    // 3. Notifications
    const notificationsGranted = await this.requestNotifications();

    // 4. Motion
    const motionGranted = await this.requestMotion();

    return {
      camera: cameraGranted,
      location: locationGranted,
      notifications: notificationsGranted,
      motion: motionGranted,
    };
  }

  // Show a device push notification if permission is active
  public notifyUser(title: string, body: string) {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } catch {
        // Notification API failed
      }
    }

    // Always dispatch in-app security notification event
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('safeguard:notification', {
            detail: { title, body, timestamp: Date.now() },
          })
        );
      } catch {
        // ignore
      }

      // Audible security chime synthesizer
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {
        // audio context blocked until user interaction
      }
    }
  }
}

export const PermissionManager = new PermissionManagerService();
