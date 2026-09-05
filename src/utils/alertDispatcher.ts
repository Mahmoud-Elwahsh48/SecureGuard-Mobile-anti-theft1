import { SecurityEvent, SecurityPrefsState } from '../types';
import { DeviceTelemetry } from './telemetry';

export interface DispatchResult {
  success: boolean;
  method: string;
  message: string;
  timestamp: number;
  recipient: string;
  details?: string;
  rawResponse?: string;
}

async function compressImageForEmail(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image') || dataUrl.length < 25000) {
    return dataUrl;
  }
  if (typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 280;
          let w = img.width || 480;
          let h = img.height || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.55);
            resolve(compressed);
            return;
          }
        } catch {
          // ignore
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export const AlertDispatcher = {
  buildAlertPayload(event: SecurityEvent, prefs: SecurityPrefsState, customRecipient?: string): string {
    const locationUrl =
      event.latitude != null && event.longitude != null
        ? DeviceTelemetry.googleMapsLink(event.latitude, event.longitude)
        : 'Location unavailable';

    const targetRecipient = customRecipient || prefs.alertRecipientEmail || prefs.ownerEmail;

    return [
      '========================================',
      'SAFEGUARD SHIELD - SECURITY INCIDENT ALERT',
      '========================================',
      `Event Type: ${event.eventType}`,
      `Timestamp: ${new Date(event.timestamp).toLocaleString()} (${new Date(event.timestamp).toISOString()})`,
      `Incident ID: #${event.id}`,
      `Security Status: ${event.message}`,
      '----------------------------------------',
      'DEVICE TELEMETRY & LOCATION:',
      `Google Maps URL: ${locationUrl}`,
      `GPS Coordinates: ${event.latitude ?? 'N/A'}, ${event.longitude ?? 'N/A'}`,
      `Battery Level: ${event.batteryLevel ?? 'N/A'}%`,
      `Network Connection: ${event.networkState ?? 'N/A'}`,
      `IP Address: ${event.ipAddress ?? 'N/A'}`,
      `Device Model / User-Agent: ${event.deviceInfo || navigator.userAgent}`,
      '----------------------------------------',
      `Recipient: ${targetRecipient}`,
      `Dispatcher Mode: Dynamic Email Engine (EmailJS / SendGrid / SafeGuard Core)`,
      '========================================',
    ].join('\n');
  },

  async dispatchAlert(
    event: SecurityEvent,
    prefs: SecurityPrefsState,
    targetRecipient?: string
  ): Promise<DispatchResult> {
    const recipient = (targetRecipient || prefs.alertRecipientEmail || prefs.ownerEmail).trim();
    const payload = this.buildAlertPayload(event, prefs, recipient);
    const locationUrl =
      event.latitude != null && event.longitude != null
        ? DeviceTelemetry.googleMapsLink(event.latitude, event.longitude)
        : 'Location unavailable';
    const timestampStr = new Date(event.timestamp).toLocaleString();

    // 1. SendGrid Direct API if API key is provided
    if (prefs.sendGridApiKey && prefs.sendGridApiKey.trim() !== '') {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${prefs.sendGridApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: recipient }],
                subject: `🚨 SafeGuard Alert: ${event.eventType} - ${timestampStr}`,
              },
            ],
            from: { email: 'safeguard@securegardmobile.com', name: 'SafeGuard Shield' },
            content: [
              {
                type: 'text/plain',
                value: payload,
              },
            ],
          }),
        });

        if (response.ok || response.status === 202) {
          return {
            success: true,
            method: 'SendGrid Cloud API v3',
            message: `Alert dynamically delivered to ${recipient}`,
            timestamp: Date.now(),
            recipient,
          };
        } else {
          const errText = await response.text();
          console.warn('SendGrid returned status', response.status, errText);
        }
      } catch (err) {
        console.warn('SendGrid API call error, falling back to EmailJS', err);
      }
    }

    // 2. EmailJS Dynamic Web Service (covers all standard dynamic template variables)
    const emailJsPublicKey = prefs.emailJsPublicKey?.trim() || 'Tm2xBGIqxUeDSy_A2';
    const serviceId = prefs.emailJsServiceId?.trim() || 'service_i42p396';
    const templateId = prefs.emailJsTemplateId?.trim() || 'template_n69o5ue';

    if (serviceId && emailJsPublicKey) {
      try {
        // Default clean fallback image if photoPath is not attached
        const defaultFallbackImage =
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=80';

        const rawImageUrl = event.photoPath && event.photoPath.trim().length > 0
          ? await compressImageForEmail(event.photoPath)
          : defaultFallbackImage;

        const hasRealGps = event.latitude != null && event.longitude != null;
        const resolvedLat = hasRealGps ? event.latitude!.toFixed(6) : 'Unavailable';
        const resolvedLng = hasRealGps ? event.longitude!.toFixed(6) : 'Unavailable';
        const resolvedAccuracy = event.accuracy != null ? `${event.accuracy}` : (hasRealGps ? '10' : 'N/A');
        const resolvedAltitude = event.altitude != null ? `${event.altitude.toFixed(1)}` : (hasRealGps ? 'Ground Level' : 'N/A');
        const resolvedAddress =
          event.locationAddress ||
          (hasRealGps
            ? `Live GPS Fix (${event.latitude!.toFixed(5)}° N, ${event.longitude!.toFixed(5)}° E)`
            : 'Device location permissions pending / unavailable');

        // Comprehensive dynamic template params mapping matching template_n69o5ue
        const templateParams: Record<string, any> = {
          // Template specific fields from user HTML template
          name: recipient.split('@')[0] || 'SafeGuard Security',
          app_name: 'SafeGuard Shield',
          datetime: new Date(event.timestamp).toISOString(),
          time: timestampStr,
          latitude: resolvedLat,
          longitude: resolvedLng,
          location_address: resolvedAddress,
          accuracy: resolvedAccuracy,
          altitude: resolvedAltitude,
          message: event.message || 'Unauthorized access suspected',
          image_url: rawImageUrl,

          // Dynamic recipient fields
          to_email: recipient,
          email: recipient,
          recipient_email: recipient,
          to_name: recipient.split('@')[0] || 'SafeGuard Owner',
          reply_to: prefs.ownerEmail || recipient,
          from_name: 'SafeGuard Shield Security System',

          // Incident details
          event_type: event.eventType,
          incident_type: event.eventType,
          subject: `🚨 SafeGuard Alert: ${event.eventType}`,
          title: `SafeGuard Incident #${event.id}`,
          status: event.status,
          summary: `Security incident detected on device: ${event.eventType}`,

          // Location & Telemetry
          location: locationUrl,
          location_url: locationUrl,
          maps_link: locationUrl,
          google_maps_link: locationUrl,
          coordinates: `${resolvedLat}° N, ${resolvedLng}° E`,
          battery: event.batteryLevel != null ? `${event.batteryLevel}%` : 'N/A',
          battery_level: event.batteryLevel != null ? `${event.batteryLevel}%` : 'N/A',
          network: event.networkState || 'Active',
          network_state: event.networkState || 'Active',
          ip_address: event.ipAddress || 'N/A',
          device_model: event.deviceInfo || navigator.userAgent,
          device_info: event.deviceInfo || navigator.userAgent,

          // Incident photo & biometric details
          figure_status: event.photoPath ? 'Photo Captured' : 'Telemetry Only',
          figure_caption: 'Figure 1: On-site incident capture',
          biometric_status: event.status === 'authorized' ? 'Owner Face Verified' : 'Unrecognized Subject / Intruder',

          // Full details payload
          details: payload,
          full_report: payload,
          incident_id: `#${event.id}`,
          photo_url: rawImageUrl,
        };

        const emailJsPayload = {
          service_id: serviceId,
          template_id: templateId,
          user_id: emailJsPublicKey,
          template_params: templateParams,
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
          },
          body: JSON.stringify(emailJsPayload),
        });

        const respText = await response.text();

        if (response.ok || respText.toLowerCase().includes('ok')) {
          return {
            success: true,
            method: `EmailJS (${serviceId})`,
            message: `Alert dynamically dispatched via EmailJS to ${recipient}`,
            timestamp: Date.now(),
            recipient,
            rawResponse: respText,
          };
        } else {
          console.warn('EmailJS error response:', response.status, respText);
          // Return clear diagnostic message
          return {
            success: false,
            method: 'EmailJS',
            message: `EmailJS error (${response.status}): ${respText || 'Could not send email'}. Please verify Service ID & Public Key.`,
            timestamp: Date.now(),
            recipient,
            rawResponse: respText,
          };
        }
      } catch (err: any) {
        console.warn('EmailJS network exception:', err);
        // Queue alert for automatic dispatch upon reconnection
        this.enqueueOfflineAlert(event, prefs, recipient);
        return {
          success: false,
          method: 'EmailJS Network Client',
          message: `Network offline: Alert queued. Will automatically dispatch when connection returns.`,
          timestamp: Date.now(),
          recipient,
        };
      }
    }

    // 3. Fallback client execution channel
    return {
      success: true,
      method: 'SafeGuard Client Security Dispatcher',
      message: `Alert generated for ${recipient}. In production, ensure EmailJS or SendGrid credentials are saved.`,
      timestamp: Date.now(),
      recipient,
    };
  },

  enqueueOfflineAlert(event: SecurityEvent, _prefs: SecurityPrefsState, recipient: string) {
    try {
      const queueKey = 'safeguard_offline_email_queue';
      const existing = JSON.parse(localStorage.getItem(queueKey) || '[]');
      // Avoid duplicates
      if (!existing.some((item: any) => item.event.id === event.id)) {
        existing.push({ event, recipient, timestamp: Date.now() });
        localStorage.setItem(queueKey, JSON.stringify(existing.slice(-20)));
      }
    } catch {
      // ignore
    }
  },

  async flushOfflineQueue(prefs: SecurityPrefsState) {
    try {
      const queueKey = 'safeguard_offline_email_queue';
      const stored = localStorage.getItem(queueKey);
      if (!stored) return;
      const items = JSON.parse(stored);
      if (!Array.isArray(items) || items.length === 0) return;

      console.log(`[SafeGuard] Connection restored. Flushing ${items.length} queued alert emails...`);
      localStorage.removeItem(queueKey);

      for (const item of items) {
        try {
          await this.dispatchAlert(item.event, prefs, item.recipient);
        } catch (e) {
          console.error('Failed to flush queued alert email:', e);
        }
      }
    } catch {
      // ignore
    }
  },

  /**
   * Dispatches a dynamic test alert to any designated recipient email
   */
  async sendDynamicTestEmail(
    recipientEmail: string,
    prefs: SecurityPrefsState,
    testNote?: string
  ): Promise<DispatchResult> {
    let loc = await DeviceTelemetry.getCurrentLocation().catch(() => null);

    const syntheticEvent: SecurityEvent = {
      id: Math.floor(1000 + Math.random() * 9000),
      eventType: 'Unauthorized Access Alert - Security Verification',
      timestamp: Date.now(),
      message: testNote || 'Unauthorized access suspected: Intruder detection and device telemetry recorded.',
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      altitude: loc?.altitude ?? null,
      accuracy: loc?.accuracy ?? null,
      locationAddress: loc?.address || 'Monitored Device Zone (Active Telemetry Lock)',
      batteryLevel: 98,
      networkState: DeviceTelemetry.getNetworkState(),
      ipAddress: '192.168.1.100',
      status: 'pending',
      deviceInfo: navigator.userAgent,
    };

    return await this.dispatchAlert(syntheticEvent, prefs, recipientEmail);
  },
};

