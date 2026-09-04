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
  timestamp?: number;
}

let cachedLocationResult: LocationResult | null = null;
let cachedIpResult: { ip: string; location?: LocationResult } | null = null;
let lastTelemetryCache: DeviceTelemetryData | null = null;
const telemetryListeners: Set<(telemetry: DeviceTelemetryData) => void> = new Set();

const notifyTelemetryListeners = (telemetry: DeviceTelemetryData) => {
  telemetryListeners.forEach((fn) => {
    try {
      fn(telemetry);
    } catch (err) {
      console.error('Telemetry listener error:', err);
    }
  });
};

export const DeviceTelemetry = {
  subscribe(listener: (telemetry: DeviceTelemetryData) => void): () => void {
    telemetryListeners.add(listener);
    if (lastTelemetryCache) {
      listener(lastTelemetryCache);
    }
    return () => telemetryListeners.delete(listener);
  },

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
    if (cachedIpResult) {
      return cachedIpResult;
    }

    // 1. Try ipwho.is for high accuracy IP geolocation without API keys
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latitude && data.longitude) {
          const locParts = [data.city, data.region, data.country].filter(Boolean);
          const result = {
            ip: data.ip || '192.168.1.102',
            location: {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              altitude: null,
              accuracy: 2500, // standard IP lookup approx accuracy in meters
              source: 'ip_lookup' as const,
              address: locParts.join(', ') || `${data.country || 'Network Location'} (Approx.)`,
              timestamp: Date.now(),
            },
          };
          cachedIpResult = result;
          return result;
        }
      }
    } catch {
      // Continue to next IP service
    }

    // 2. Try freeipapi.com as secondary provider
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const locParts = [data.cityName, data.regionName, data.countryName].filter(Boolean);
          const result = {
            ip: data.ipAddress || '192.168.1.102',
            location: {
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              altitude: null,
              accuracy: 5000,
              source: 'ip_lookup' as const,
              address: `${locParts.join(', ')} (Approx.)`,
              timestamp: Date.now(),
            },
          };
          cachedIpResult = result;
          return result;
        }
      }
    } catch {
      // Continue
    }

    // 3. Fallback to basic ipify
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const result = { ip: data.ip || '192.168.1.102' };
        cachedIpResult = result;
        return result;
      }
    } catch {
      // Fallback
    }

    return { ip: '192.168.1.102' };
  },

  async reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
    // 1. First attempt: BigDataCloud client-side reverse geocoding (fast, CORS-supported, highly accurate city/district/country)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const parts: string[] = [];
        if (data.locality && data.locality !== data.city) parts.push(data.locality);
        if (data.city) parts.push(data.city);
        else if (data.principalSubdivision) parts.push(data.principalSubdivision);
        if (data.countryName) parts.push(data.countryName);

        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch {
      // Fallback to OpenStreetMap
    }

    // 2. Second attempt: OpenStreetMap Nominatim
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
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

    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  },

  // Immediately update real GPS location from active sensor watchers or direct user requests
  async updateRealGpsPosition(coords: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
  }): Promise<LocationResult> {
    const lat = coords.latitude;
    const lon = coords.longitude;
    const address = await this.reverseGeocode(lat, lon);

    const result: LocationResult = {
      latitude: lat,
      longitude: lon,
      altitude: coords.altitude ?? null,
      accuracy: coords.accuracy ? Math.round(coords.accuracy) : 5,
      source: (coords.accuracy || 10) < 50 ? 'gps_precise' : 'gps_coarse',
      address: address || `Real GPS (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
      timestamp: Date.now(),
    };

    cachedLocationResult = result;

    if (lastTelemetryCache) {
      const updatedTelemetry: DeviceTelemetryData = {
        ...lastTelemetryCache,
        latitude: result.latitude,
        longitude: result.longitude,
        altitude: result.altitude,
        accuracy: result.accuracy,
        locationSource: result.source,
        locationAddress: result.address,
        lastUpdated: Date.now(),
      };
      lastTelemetryCache = updatedTelemetry;
      notifyTelemetryListeners(updatedTelemetry);
    }

    return result;
  },

  async getCurrentLocation(options?: { forceFresh?: boolean }): Promise<LocationResult> {
    const now = Date.now();
    // Use cached location only if it's high-precision GPS and less than 45 seconds old
    if (
      !options?.forceFresh &&
      cachedLocationResult &&
      cachedLocationResult.source === 'gps_precise' &&
      cachedLocationResult.latitude != null &&
      cachedLocationResult.timestamp &&
      now - cachedLocationResult.timestamp < 45000
    ) {
      return cachedLocationResult;
    }

    // A. Attempt native Capacitor Geolocation first if available
    try {
      if (Geolocation && typeof Geolocation.getCurrentPosition === 'function') {
        const capPos = await Promise.race([
          Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 10000,
          }),
          new Promise<null>((r) => setTimeout(() => r(null), 6000)),
        ]);

        if (capPos && capPos.coords && capPos.coords.latitude != null) {
          return await this.updateRealGpsPosition(capPos.coords);
        }
      }
    } catch (e) {
      console.log('Capacitor Geolocation not active, falling back to Web GPS', e);
    }

    // B. Attempt Web Browser Geolocation with High Accuracy (with generous 8s budget for satellite fix)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const browserPos = await new Promise<GeolocationPosition | null>((resolve) => {
          const timer = setTimeout(() => resolve(null), 8000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timer);
              resolve(pos);
            },
            () => {
              clearTimeout(timer);
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 7500, maximumAge: 10000 }
          );
        });

        if (browserPos && browserPos.coords && browserPos.coords.latitude != null) {
          return await this.updateRealGpsPosition(browserPos.coords);
        }
      } catch (err) {
        console.warn('Web Geolocation error:', err);
      }
    }

    // C. If GPS satellite fix failed or is pending permission, query Real Network IP Geolocation
    const ipData = await this.getIpAndFallbackLocation();
    if (ipData.location) {
      cachedLocationResult = ipData.location;
      return ipData.location;
    }

    return {
      latitude: null,
      longitude: null,
      altitude: null,
      accuracy: null,
      source: 'denied',
      error: 'Location access unavailable. Please grant GPS location permissions.',
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

  async collectFastTelemetry(fallbackExisting?: DeviceTelemetryData | null): Promise<DeviceTelemetryData> {
    const battery = await this.getBatteryInfo();
    const { deviceModel, os, browser } = this.getDeviceInfo();
    const networkState = this.getNetworkState();

    const existingLat = cachedLocationResult?.latitude ?? fallbackExisting?.latitude ?? lastTelemetryCache?.latitude ?? null;
    const existingLng = cachedLocationResult?.longitude ?? fallbackExisting?.longitude ?? lastTelemetryCache?.longitude ?? null;
    const existingAddress =
      cachedLocationResult?.address ??
      fallbackExisting?.locationAddress ??
      lastTelemetryCache?.locationAddress ??
      (existingLat != null && existingLng != null
        ? `GPS Fix (${existingLat.toFixed(4)}°, ${existingLng.toFixed(4)}°)`
        : 'Acquiring real device location...');
    const existingIp = cachedIpResult?.ip ?? fallbackExisting?.ipAddress ?? lastTelemetryCache?.ipAddress ?? '192.168.1.102';

    const fastData: DeviceTelemetryData = {
      batteryLevel: battery.level,
      isCharging: battery.charging,
      networkState,
      ipAddress: existingIp,
      latitude: existingLat,
      longitude: existingLng,
      altitude: cachedLocationResult?.altitude ?? fallbackExisting?.altitude ?? null,
      accuracy: cachedLocationResult?.accuracy ?? fallbackExisting?.accuracy ?? null,
      locationSource: cachedLocationResult?.source ?? fallbackExisting?.locationSource ?? 'pending',
      locationAddress: existingAddress,
      deviceModel,
      os,
      browser,
      lastUpdated: Date.now(),
    };

    lastTelemetryCache = fastData;

    // Trigger full background telemetry update if not already cached
    if (!cachedLocationResult || cachedLocationResult.source !== 'gps_precise') {
      setTimeout(() => {
        this.collectFullTelemetry().catch(() => {});
      }, 50);
    }

    return fastData;
  },

  async collectFullTelemetry(): Promise<DeviceTelemetryData> {
    const [battery, location, ipInfo] = await Promise.all([
      this.getBatteryInfo(),
      this.getCurrentLocation(),
      this.getIpAndFallbackLocation(),
    ]);

    const { deviceModel, os, browser } = this.getDeviceInfo();

    const fullData: DeviceTelemetryData = {
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

    lastTelemetryCache = fullData;
    return fullData;
  },

  googleMapsLink(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  },
};

