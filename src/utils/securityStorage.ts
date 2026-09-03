import { SecurityEvent, SecurityPrefsState } from '../types';

const PREFS_STORAGE_KEY = 'safeguard_shield_prefs_v1';
const EVENTS_STORAGE_KEY = 'safeguard_shield_events_v1';

const DEFAULT_PREFS: SecurityPrefsState = {
  ownerEmail: 'mahmoudelwahsh48@gmail.com',
  alertRecipientEmail: 'mahmoudelwahsh48@gmail.com',
  sendGridApiKey: '',
  emailJsServiceId: 'service_i42p396',
  emailJsTemplateId: 'template_n69o5ue',
  emailJsPublicKey: 'Tm2xBGIqxUeDSy_A2',
  ownerFaceEmbedding: null,
  ownerFacePhoto: null,
  enrolledTimestamp: null,
  isMonitoring: true,
  autoCapture: true,
  soundAlert: true,
  securityPin: '1234',
  requirePinToDisarm: true,
};

const INITIAL_SAMPLE_EVENTS: SecurityEvent[] = [
  {
    id: 1718000000000,
    eventType: 'Device Boot Completed',
    timestamp: Date.now() - 3600000 * 4,
    message: 'Security condition detected and owner verified',
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 15.2,
    batteryLevel: 94,
    networkState: 'wifi',
    ipAddress: '192.168.1.45',
    status: 'authorized',
    deviceInfo: 'SafeGuard Client Web 1.0 (Linux/x86_64)',
  },
  {
    id: 1718000001000,
    eventType: 'Screen On - Unrecognized Face',
    timestamp: Date.now() - 3600000 * 2,
    message: 'Unauthorized access suspected',
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 14.8,
    batteryLevel: 88,
    networkState: 'wifi',
    ipAddress: '192.168.1.45',
    status: 'sent',
    deviceInfo: 'SafeGuard Client Web 1.0 (Linux/x86_64)',
  }
];

export const SecurityStorage = {
  getPrefs(): SecurityPrefsState {
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (!stored) return DEFAULT_PREFS;
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        emailJsServiceId:
          parsed.emailJsServiceId === 'service_pegyggo' || !parsed.emailJsServiceId
            ? DEFAULT_PREFS.emailJsServiceId
            : parsed.emailJsServiceId,
        emailJsTemplateId:
          parsed.emailJsTemplateId === 'template_safeguard' || !parsed.emailJsTemplateId
            ? DEFAULT_PREFS.emailJsTemplateId
            : parsed.emailJsTemplateId,
        emailJsPublicKey: parsed.emailJsPublicKey || DEFAULT_PREFS.emailJsPublicKey,
      };
    } catch {
      return DEFAULT_PREFS;
    }
  },

  savePrefs(prefs: Partial<SecurityPrefsState>): SecurityPrefsState {
    const current = this.getPrefs();
    const updated = { ...current, ...prefs };
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save security prefs', e);
    }
    return updated;
  },

  getAllEvents(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_EVENTS));
        return INITIAL_SAMPLE_EVENTS;
      }
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  insertEvent(event: Omit<SecurityEvent, 'id'>): SecurityEvent {
    const events = this.getAllEvents();
    const newEvent: SecurityEvent = {
      ...event,
      id: Date.now() + Math.floor(Math.random() * 1000),
    };
    const updated = [newEvent, ...events];
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to insert security event', e);
    }
    return newEvent;
  },

  updateEventStatus(id: number, status: SecurityEvent['status'], error?: string): void {
    const events = this.getAllEvents();
    const updated = events.map((ev) =>
      ev.id === id ? { ...ev, status, ...(error ? { dispatchError: error } : {}) } : ev
    );
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update event status', e);
    }
  },

  clearEvents(): void {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.error('Failed to clear events', e);
    }
  },

  deleteEvent(id: number): void {
    const events = this.getAllEvents();
    const updated = events.filter((ev) => ev.id !== id);
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete event', e);
    }
  }
};
