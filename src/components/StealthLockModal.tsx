import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, AlertTriangle, Battery, Wifi } from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface StealthLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerBreach: (triggerSource: string) => Promise<void>;
  prefs: SecurityPrefsState;
}

export const StealthLockModal: React.FC<StealthLockModalProps> = ({
  isOpen,
  onClose,
  onTriggerBreach,
  prefs,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [breachAlertText, setBreachAlertText] = useState<string | null>(null);
  const [isBreached, setIsBreached] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const touchStartTime = useRef<number>(0);

  // Keep time updated for subtle clock
  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Get battery if available
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((batt: any) => {
        setBatteryLevel(Math.round(batt.level * 100));
        batt.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(batt.level * 100));
        });
      }).catch(() => {});
    }

    // Try requesting fullscreen for true lock-screen feel
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // ignore
      }
    };
  }, [isOpen]);

  // If user inputs 4-digit PIN
  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError(false);

    if (next.length === 4) {
      const correctPin = prefs.securityPin || '1234';
      if (next === correctPin) {
        // Successful disarm/exit
        onClose();
        setPinInput('');
        setShowPinPad(false);
      } else {
        // Wrong PIN! Trigger intruder alert!
        setPinError(true);
        setIsBreached(true);
        setBreachAlertText('WRONG PIN ENTERED! Intruder photo captured & dispatched.');
        onTriggerBreach('Wrong Security PIN on Lock Screen');
        setTimeout(() => {
          setPinInput('');
        }, 800);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleScreenTouch = () => {
    if (isBreached) return;
    const now = Date.now();
    // If PIN pad is not showing, a tap reveals the subtle PIN unlock
    if (!showPinPad) {
      setShowPinPad(true);
    }
    touchStartTime.current = now;
  };

  if (!isOpen) return null;

  return (
    <div
      id="stealth-lock-screen"
      onClick={handleScreenTouch}
      className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between items-center select-none overflow-hidden touch-none"
    >
      {/* 1. Subtle Stealth Status Bar (Looks like real mobile lock screen) */}
      <div className="w-full px-6 pt-3 flex items-center justify-between text-xs text-zinc-600 font-mono">
        <div className="flex items-center space-x-2">
          <span>SafeGuard Sentinel</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>
        <div className="flex items-center space-x-3 text-zinc-500">
          <Wifi className="h-3.5 w-3.5" />
          {batteryLevel !== null && (
            <div className="flex items-center space-x-1">
              <span>{batteryLevel}%</span>
              <Battery className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>

      {/* 2. Intruder Breach Alarm Banner (if triggered) */}
      {isBreached && (
        <div
          id="stealth-breach-banner"
          className="mx-4 my-2 p-4 rounded-2xl bg-rose-950/90 border border-rose-500 text-center text-rose-200 shadow-2xl animate-bounce space-y-1.5"
        >
          <div className="flex items-center justify-center space-x-2 font-black text-white text-base">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <span>SECURITY INTRUDER ALERT</span>
          </div>
          <p className="text-xs text-rose-300 font-semibold">{breachAlertText}</p>
          <p className="text-[11px] text-rose-400 font-mono">
            Sent to: {prefs.alertRecipientEmail || prefs.ownerEmail}
          </p>
        </div>
      )}

      {/* 3. Center Screen: Clock or PIN Unlock Pad */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs px-4">
        {!showPinPad ? (
          <div className="text-center space-y-4 cursor-pointer">
            <div className="text-7xl sm:text-8xl font-thin tracking-tighter text-zinc-700">
              {currentTime || '00:00'}
            </div>
            <div className="flex flex-col items-center space-y-1 text-zinc-800 text-xs">
              <div className="flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>Protected by SafeGuard Shield</span>
              </div>
              <p className="text-[10px] text-zinc-700">Tap anywhere to enter owner PIN</p>
            </div>
          </div>
        ) : (
          <div
            id="stealth-pin-pad"
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col items-center space-y-6"
          >
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Enter Owner PIN to Exit</span>
              </div>
              <p className="text-[11px] text-zinc-600">
                Unauthorized attempts capture optical photo & dispatch alert
              </p>
            </div>

            {/* PIN Dots */}
            <div className="flex items-center space-x-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 transition-all ${
                    pinInput.length > idx
                      ? pinError
                        ? 'border-rose-500 bg-rose-500'
                        : 'border-emerald-400 bg-emerald-400 shadow-md shadow-emerald-400/50'
                      : 'border-zinc-800 bg-zinc-950'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-3.5 w-full max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 text-xl font-medium text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 transition flex items-center justify-center shadow-md"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setShowPinPad(false)}
                className="h-14 w-14 rounded-full bg-transparent text-xs font-semibold text-zinc-500 hover:text-zinc-300 flex items-center justify-center active:scale-95 transition"
              >
                Hide
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 text-xl font-medium text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 transition flex items-center justify-center shadow-md"
              >
                0
              </button>
              <button
                onClick={handleDeleteDigit}
                className="h-14 w-14 rounded-full bg-transparent text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center justify-center active:scale-95 transition"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Footer note */}
      <div className="w-full pb-4 px-6 text-center">
        <p className="text-[10px] text-zinc-800 font-mono tracking-wide">
          Optical camera vigilance & hardware sensors armed
        </p>
      </div>
    </div>
  );
};
