export type EventStatus = 'authorized' | 'pending' | 'sent' | 'failed';

export interface SecurityEvent {
  id: number;
  eventType: string;
  timestamp: number;
  message: string;
  photoPath?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  batteryLevel?: number | null;
  networkState?: string | null;
  ipAddress?: string | null;
  status: EventStatus;
  deviceInfo?: string;
  dispatchError?: string;
}

export interface SecurityPrefsState {
  ownerEmail: string;
  alertRecipientEmail: string;
  sendGridApiKey: string;
  emailJsServiceId: string;
  emailJsTemplateId: string;
  emailJsPublicKey: string;
  ownerFaceEmbedding: number[] | null;
  ownerFacePhoto: string | null;
  enrolledTimestamp?: number | null;
  isMonitoring: boolean;
  autoCapture: boolean;
  soundAlert: boolean;
}

export interface DeviceTelemetryData {
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkState: string;
  ipAddress: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  deviceModel: string;
  os: string;
  browser: string;
  lastUpdated: number;
}

export interface TriggerType {
  id: string;
  name: string;
  iconName: string;
  description: string;
  category: 'hardware' | 'power' | 'motion' | 'system' | 'manual';
}

export interface FaceMatchResult {
  isMatch: boolean;
  distance: number;
  threshold: number;
  confidence: number;
  extractedFeaturesCount: number;
}
