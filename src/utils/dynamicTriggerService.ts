/**
 * Dynamic Trigger Service for SafeGuard Shield
 * Listens to real-time device hardware events:
 * - Charger Connected / Disconnected (Battery API)
 * - Airplane Mode / Network state changes (Online / Offline / Network Information API)
 * - Screen On / Screen Off / Wake / Visibility Change (Page Visibility API & Window Focus)
 * - Motion & Tamper displacement (Device Motion API & Accelerometer)
 * - Power / Lock button hardware simulation
 */

export interface DynamicSensorStatus {
  screenSensor: boolean;
  batterySensor: boolean;
  networkSensor: boolean;
  motionSensor: boolean;
  isMonitoring: boolean;
  batteryLevel?: number | null;
  isOnline?: boolean;
}

type TriggerCallback = (triggerName: string, details?: Record<string, any>) => Promise<void> | void;

class DynamicTriggerServiceImpl {
  private isMonitoring = false;
  private triggerCallback: TriggerCallback | null = null;
  private statusListeners: Set<(status: DynamicSensorStatus) => void> = new Set();

  // State caches to detect real hardware transitions
  private lastCharging: boolean | null = null;
  private lastBatteryLevel: number | null = null;
  private lastOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private lastVisibility: DocumentVisibilityState = typeof document !== 'undefined' ? document.visibilityState : 'visible';
  private lastTriggerTime: Record<string, number> = {};

  // Listeners state
  private batteryObj: any = null;
  private batteryPollingInterval: any = null;
  private motionAttached = false;
  private lastMotionTrigger = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSensors();
    }
  }

  public subscribeStatus(listener: (status: DynamicSensorStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (err) {
        console.error('Status listener error', err);
      }
    });
  }

  public getStatus(): DynamicSensorStatus {
    return {
      screenSensor: typeof document !== 'undefined' && 'visibilityState' in document,
      batterySensor: typeof navigator !== 'undefined' && 'getBattery' in navigator,
      networkSensor: typeof navigator !== 'undefined' && 'onLine' in navigator,
      motionSensor: typeof window !== 'undefined' && 'DeviceMotionEvent' in window,
      isMonitoring: this.isMonitoring,
      batteryLevel: this.lastBatteryLevel != null ? Math.round(this.lastBatteryLevel * 100) : null,
      isOnline: this.lastOnline,
    };
  }

  public setTriggerCallback(cb: TriggerCallback) {
    this.triggerCallback = cb;
  }

  public setMonitoring(active: boolean) {
    this.isMonitoring = active;
    this.notifyStatus();

    if (active) {
      this.startListeners();
    } else {
      this.stopListeners();
    }
  }

  // Safe throttled trigger execution (prevents duplicate triggers within 1.2 seconds)
  public fireTrigger(triggerName: string, details?: Record<string, any>, force: boolean = false) {
    if (!this.isMonitoring && !force) return;

    const now = Date.now();
    const lastFired = this.lastTriggerTime[triggerName] || 0;
    if (!force && now - lastFired < 1200) {
      // Throttled
      return;
    }

    this.lastTriggerTime[triggerName] = now;
    console.log(`[SafeGuard Dynamic Trigger] Firing: ${triggerName}`, details);

    if (this.triggerCallback) {
      try {
        this.triggerCallback(triggerName, details);
      } catch (e) {
        console.error(`Error executing dynamic trigger ${triggerName}`, e);
      }
    }
  }

  private async initSensors() {
    // 1. Initialize Battery Sensor
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        this.batteryObj = await (navigator as any).getBattery();
        if (this.batteryObj) {
          this.lastCharging = this.batteryObj.charging;
          this.lastBatteryLevel = this.batteryObj.level;

          this.batteryObj.addEventListener('chargingchange', () => {
            const currentCharging = this.batteryObj.charging;
            if (this.lastCharging !== null && this.lastCharging !== currentCharging) {
              this.lastCharging = currentCharging;
              if (currentCharging) {
                this.fireTrigger('Charger Connected', {
                  batteryLevel: Math.round(this.batteryObj.level * 100),
                  source: 'hardware_battery_api',
                });
              } else {
                this.fireTrigger('Charger Disconnected', {
                  batteryLevel: Math.round(this.batteryObj.level * 100),
                  source: 'hardware_battery_api_power_loss',
                });
              }
            } else {
              this.lastCharging = currentCharging;
            }
          });
        }
      } catch (err) {
        console.log('Dynamic Battery API init notice:', err);
      }
    }

    // 2. Initialize Network / Airplane Mode Sensor
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        this.lastOnline = false;
        this.fireTrigger('Airplane Mode Changed', {
          state: 'offline',
          reason: 'Network link severed / Airplane mode enabled',
        });
      });

      window.addEventListener('online', () => {
        this.lastOnline = true;
        this.fireTrigger('Airplane Mode Changed', {
          state: 'online',
          reason: 'Network radio connection re-established',
        });
      });

      // Network Information API change
      const navAny = navigator as any;
      const conn = navAny.connection || navAny.mozConnection || navAny.webkitConnection;
      if (conn && typeof conn.addEventListener === 'function') {
        conn.addEventListener('change', () => {
          if (!navigator.onLine) {
            this.fireTrigger('Airplane Mode Changed', {
              state: 'disconnected',
              effectiveType: conn.effectiveType,
            });
          }
        });
      }
    }

    // 3. Initialize Screen On / Wake / Visibility Sensor & Power Button
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const currentVisibility = document.visibilityState;
        if (this.lastVisibility === 'hidden' && currentVisibility === 'visible') {
          // Screen was woken, power button clicked, phone unlocked, or user returned to app
          this.fireTrigger('Screen Woken / Screen On', {
            source: 'hardware_visibility_wake',
            timestamp: Date.now(),
          });
        } else if (this.lastVisibility === 'visible' && currentVisibility === 'hidden') {
          // Power button pressed or phone locked / switched away
          this.fireTrigger('Power Button / Screen Locked', {
            source: 'hardware_visibility_lock',
            timestamp: Date.now(),
          });
        }
        this.lastVisibility = currentVisibility;
      });

      // Window focus/blur tracking
      window.addEventListener('focus', () => {
        this.fireTrigger('Screen Woken / App Focused', {
          source: 'window_focus_event',
          timestamp: Date.now(),
        });
      });

      window.addEventListener('blur', () => {
        if (document.visibilityState === 'hidden') {
          this.fireTrigger('Power Button / Screen Locked', {
            source: 'window_blur_lock',
            timestamp: Date.now(),
          });
        }
      });

      // Listen for sentinel background heartbeat ticks to verify battery state
      window.addEventListener('safeguard:sentinel-tick', () => {
        this.checkBatteryStatus().catch(() => {});
      });
    }

    // 4. Initialize Motion Sensor
    this.setupMotionSensor();
  }

  public async checkBatteryStatus() {
    if (!this.isMonitoring) return;
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        if (!this.batteryObj) {
          this.batteryObj = await (navigator as any).getBattery();
        }
        if (this.batteryObj) {
          const currentCharging = this.batteryObj.charging;
          if (this.lastCharging !== null && this.lastCharging !== currentCharging) {
            this.lastCharging = currentCharging;
            if (currentCharging) {
              this.fireTrigger('Charger Connected', {
                batteryLevel: Math.round(this.batteryObj.level * 100),
                source: 'sentinel_tick_battery_charging',
              });
            } else {
              this.fireTrigger('Charger Disconnected', {
                batteryLevel: Math.round(this.batteryObj.level * 100),
                source: 'sentinel_tick_battery_unplugged',
              });
            }
          } else {
            this.lastCharging = currentCharging;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private setupMotionSensor() {
    if (this.motionAttached || typeof window === 'undefined') return;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!this.isMonitoring) return;

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const totalAcc = Math.sqrt(x * x + y * y + z * z);

      // Earth gravity is ~9.8 m/s^2. A sudden jerk, grab, or snatch causes total acceleration to spike > 17 m/s^2
      const now = Date.now();
      if (totalAcc > 17.0 && now - this.lastMotionTrigger > 3500) {
        this.lastMotionTrigger = now;
        this.fireTrigger('Motion & Tamper Alert', {
          acceleration: totalAcc.toFixed(2),
          source: 'accelerometer_spike',
        });
      }
    };

    try {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
      this.motionAttached = true;
    } catch {
      // not supported
    }

    // Modern Generic Sensor API fallback if available (Chrome Android)
    try {
      const winAny = window as any;
      if (winAny.LinearAccelerationSensor) {
        const sensor = new winAny.LinearAccelerationSensor({ frequency: 20 });
        sensor.addEventListener('reading', () => {
          if (!this.isMonitoring) return;
          const total = Math.sqrt(sensor.x * sensor.x + sensor.y * sensor.y + sensor.z * sensor.z);
          const now = Date.now();
          if (total > 7.5 && now - this.lastMotionTrigger > 3500) {
            this.lastMotionTrigger = now;
            this.fireTrigger('Motion & Tamper Alert', {
              acceleration: total.toFixed(2),
              source: 'linear_sensor_spike',
            });
          }
        });
        sensor.start();
      }
    } catch {
      // not supported
    }
  }

  private startListeners() {
    // Start battery polling fallback (in case browser doesn't dispatch chargingchange reliably)
    if (!this.batteryPollingInterval && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      this.batteryPollingInterval = setInterval(async () => {
        if (!this.isMonitoring) return;
        try {
          if (!this.batteryObj) {
            this.batteryObj = await (navigator as any).getBattery();
          }
          if (this.batteryObj) {
            const currentCharging = this.batteryObj.charging;
            if (this.lastCharging !== null && this.lastCharging !== currentCharging) {
              this.lastCharging = currentCharging;
              if (currentCharging) {
                this.fireTrigger('Charger Connected', {
                  batteryLevel: Math.round(this.batteryObj.level * 100),
                  source: 'poll_battery_charging',
                });
              } else {
                this.fireTrigger('Charger Disconnected', {
                  batteryLevel: Math.round(this.batteryObj.level * 100),
                  source: 'poll_battery_disconnected',
                });
              }
            } else {
              this.lastCharging = currentCharging;
            }
          }
        } catch {
          // ignore
        }
      }, 1500);
    }
  }

  private stopListeners() {
    if (this.batteryPollingInterval) {
      clearInterval(this.batteryPollingInterval);
      this.batteryPollingInterval = null;
    }
  }

  /**
   * Directly test / simulate any dynamic trigger
   */
  public simulateTrigger(triggerName: string) {
    this.fireTrigger(triggerName, { simulated: true, timestamp: Date.now() }, true);
  }
}

export const DynamicTriggerService = new DynamicTriggerServiceImpl();
