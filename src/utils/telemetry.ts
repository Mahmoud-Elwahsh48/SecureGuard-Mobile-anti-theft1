import { Geolocation } from '@capacitor/geolocation';
import { DeviceTelemetryData } from '../types';

export interface LocationResult {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
  source: 'gps_precise' | 'gps_coarse' | 'ip_lookup' | 'pending' | 'denied';
  address?: string;
  error?: string;
}

export const DeviceTelemetry = {
  async getBatteryInfo(): Promise<{ level: number | null; charging: boolean | null }> {
    try {
      if ('getBattery' in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
        };
      }
    } catch {
      // Fallback
    }
    return { level: 85, charging: true };
  },

  getNetworkState(): string {
    try {
      if (!navigator.onLine) return 'offline';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        if (conn.type) return conn.type;
        if (conn.effectiveType) return `cellular (${conn.effectiveType})`;
      }
      return 'wifi';
    } catch {
      return navigator.onLine ? 'wifi' : 'disconnected';
    }
  },

  async getIpAndFallbackLocation(): Promise<{ ip: string; location?: LocationResult }> {
    // 1. Try ipwho.is for high accuracy IP geolocation without API keys
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const locParts = [data.city, data.region, data.country].filter(Boolean);
          return {
            ip: data.ip || '192.168.1.102',
            location: {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              altitude: null,
              accuracy: 2500, // standard IP lookup approx accuracy in meters
              source: 'ip_lookup',
              address: locParts.join(', ') || `${data.country || 'Location detected'}`,
            },
          };
        }
      }
    } catch {
      // Continue to next IP service
    }

    // 2. Try freeipapi.com as secondary provider
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const locParts = [data.cityName, data.regionName, data.countryName].filter(Boolean);
          return {
            ip: data.ipAddress || '192.168.1.102',
            location: {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              altitude: null,
              accuracy: 5000,
              source: 'ip_lookup',
              address: locParts.join(', '),
            },
          };
        }
      }
    } catch {
      // Continue
    }

    // 3. Fallback to basic ipify
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { ip: data.ip || '192.168.1.102' };
      }
    } catch {
      // Fallback
    }

    return { ip: '192.168.1.102' };
  },

  async reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
        {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
          const country = data.address.country;
          if (city && country) return `${city}, ${country}`;
          if (data.display_name) {
            const parts = data.display_name.split(', ');
            return parts.slice(0, 3).join(', ');
          }
        }
      }
    } catch {
      // Ignore reverse geocoding errors
    }
    return undefined;
  },

  async getCurrentLocation(): Promise<LocationResult> {
    // A. Attempt native Capacitor Geolocation first if available
    try {
      if (Geolocation) {
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
        } catch {
          // ignore permission check error
        }

        const capPos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });

        if (capPos && capPos.coords) {
          const address = await this.reverseGeocode(capPos.coords.latitude, capPos.coords.longitude);
          return {
            latitude: capPos.coords.latitude,
            longitude: capPos.coords.longitude,
            altitude: capPos.coords.altitude,
            accuracy: capPos.coords.accuracy ? Math.round(capPos.coords.accuracy) : 5,
            source: 'gps_precise',
            address: address || `GPS Fix (${capPos.coords.latitude.toFixed(4)}°, ${capPos.coords.longitude.toFixed(4)}°)`,
          };
        }
      }
    } catch (e) {
      console.log('Capacitor Geolocation not active, falling back to Web GPS', e);
    }

    // B. Attempt Web Browser Geolocation with High Accuracy
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const browserPos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => {
              // High accuracy timed out, try once more with coarse / cell network
              navigator.geolocation.getCurrentPosition(
                (coarsePos) => resolve(coarsePos),
                () => resolve(null),
                { timeout: 6000, enableHighAccuracy: false, maximumAge: 15000 }
              );
            },
            { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
          );
        });

        if (browserPos && browserPos.coords) {
          const isPrecise = (browserPos.coords.accuracy || 100) < 50;
          const address = await this.reverseGeocode(
            browserPos.coords.latitude,
            browserPos.coords.longitude
          );

          return {
            latitude: browserPos.coords.latitude,
            longitude: browserPos.coords.longitude,
            altitude: browserPos.coords.altitude,
            accuracy: Math.round(browserPos.coords.accuracy || 10),
            source: isPrecise ? 'gps_precise' : 'gps_coarse',
            address: address || `Real-time GPS (${browserPos.coords.latitude.toFixed(4)}°, ${browserPos.coords.longitude.toFixed(4)}°)`,
          };
        }
      } catch (err) {
        console.warn('Web Geolocation error:', err);
      }
    }

    // C. If GPS permissions are blocked or unavailable (e.g. desktop/sandbox), query Real Network IP Geolocation
    const ipData = await this.getIpAndFallbackLocation();
    if (ipData.location) {
      return ipData.location;
    }

    return {
      latitude: null,
      longitude: null,
      altitude: null,
      accuracy: null,
      source: 'denied',
      error: 'Location access unavailable. Please enable GPS permissions.',
    };
  },

  getDeviceInfo(): { deviceModel: string; os: string; browser: string } {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    const deviceModel = `${navigator.platform || 'Client'} (${os} / ${browser})`;

    return { deviceModel, os, browser };
  },

  async collectFullTelemetry(): Promise<DeviceTelemetryData> {
    const [battery, location, ipInfo] = await Promise.all([
      this.getBatteryInfo(),
      this.getCurrentLocation(),
      this.getIpAndFallbackLocation(),
    ]);

    const { deviceModel, os, browser } = this.getDeviceInfo();

    return {
      batteryLevel: battery.level,
      isCharging: battery.charging,
      networkState: this.getNetworkState(),
      ipAddress: ipInfo.ip || '192.168.1.102',
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      locationSource: location.source,
      locationAddress: location.address,
      locationError: location.error,
      deviceModel,
      os,
      browser,
      lastUpdated: Date.now(),
    };
  },

  googleMapsLink(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  },
};

