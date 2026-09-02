# SafeGuard Shield

Intelligent mobile and device security monitoring application rewritten in React with TypeScript, Vite, and Tailwind CSS.

## Overview
SafeGuard Shield monitors security triggers (screen awake, power changes, network shifts, tamper motions) to detect unauthorized intrusion. When triggered, it conducts stealth front camera capture, evaluates Euclidean facial biometric distance against the enrolled owner baseline (< 0.65 threshold), logs device telemetry (battery, network, GPS coordinates, IP address), and dispatches automated security alerts via SendGrid or EmailJS.

## Features
- **Security Monitoring Engine**: Arm and disarm live security broadcast receiver.
- **Biometric Face Enrollment & Verification**: Live front webcam capture and Euclidean landmark distance matching against enrolled owner baseline.
- **Real-Time Device Telemetry**: Continuous polling of battery levels, charging state, network connectivity, GPS coordinates with Google Maps links, and device profile.
- **Multi-Trigger Simulation & Detection**: Screen On / Unlock, Charger Connected, Charger Disconnected, Airplane Mode Changed, Device Boot Completed, and Motion / Tamper Alert.
- **Security Incident Log**: Local encrypted persistent storage replica of Room DB with search, filtering, JSON export, and full telemetry inspection.
- **Automated Alert Dispatcher**: Multi-channel email delivery (SendGrid API v3 / EmailJS) with structured payload formatting.

## Development & Build
- `npm run dev`: Starts the Vite development server on port 3000.
- `npm run build`: Builds the production bundle in `dist/`.
