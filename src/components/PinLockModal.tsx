import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldAlert,
  Delete,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  onFailedAttempt?: (attemptCount: number) => void;
  mode: 'unlock_app' | 'verify_action' | 'change_pin';
  currentPin: string;
  onPinChanged?: (newPin: string) => void;
  title?: string;
  description?: string;
  canCancel?: boolean;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onFailedAttempt,
  mode,
  currentPin,
  onPinChanged,
  title,
  description,
  canCancel = false,
}) => {
  const [pin, setPin] = useState<string>('');
  const [newPinStep, setNewPinStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [tempNewPin, setTempNewPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showDigits, setShowDigits] = useState<boolean>(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setTempNewPin('');
      setNewPinStep(currentPin ? 'current' : 'new');
    }
  }, [isOpen, currentPin]);

  if (!isOpen) return null;

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
    }, 600);
  };

  const handleKeyPress = (num: number) => {
    if (pin.length >= 4) return;
    const updated = pin + num.toString();
    setPin(updated);
    setErrorMsg(null);

    // If 4 digits entered, evaluate
    if (updated.length === 4) {
      setTimeout(() => {
        handleFourDigitsEntered(updated);
      }, 150);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const handleFourDigitsEntered = (enteredPin: string) => {
    if (mode === 'unlock_app' || mode === 'verify_action') {
      const targetPin = currentPin || '1234';
      if (enteredPin === targetPin) {
        setSuccessMsg('Access Granted');
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        setTimeout(() => {
          onSuccess();
        }, 400);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        triggerShake(`Incorrect 4-Digit Password (Attempt ${nextAttempts})`);
        if (onFailedAttempt) {
          onFailedAttempt(nextAttempts);
        }
      }
    } else if (mode === 'change_pin') {
      // Step flow for changing PIN
      if (newPinStep === 'current') {
        const targetPin = currentPin || '1234';
        if (enteredPin === targetPin) {
          setNewPinStep('new');
          setPin('');
          setErrorMsg(null);
        } else {
          triggerShake('Current 4-digit password does not match');
        }
      } else if (newPinStep === 'new') {
        setTempNewPin(enteredPin);
        setNewPinStep('confirm');
        setPin('');
        setErrorMsg(null);
      } else if (newPinStep === 'confirm') {
        if (enteredPin === tempNewPin) {
          setSuccessMsg('New 4-digit Security Password Saved!');
          if (onPinChanged) {
            onPinChanged(enteredPin);
          }
          setTimeout(() => {
            onSuccess();
          }, 600);
        } else {
          triggerShake('Passwords do not match. Try again.');
          setTimeout(() => {
            setNewPinStep('new');
            setTempNewPin('');
          }, 800);
        }
      }
    }
  };

  // Compute active modal title and subtitle
  let modalTitle = title || 'Security Password Verification';
  let modalSubtitle = description || 'Enter your 4-number passcode to proceed';

  if (mode === 'change_pin') {
    if (newPinStep === 'current') {
      modalTitle = 'Verify Current Password';
      modalSubtitle = 'Enter current 4 numbers to change security PIN';
    } else if (newPinStep === 'new') {
      modalTitle = 'Set New 4-Digit Password';
      modalSubtitle = 'Choose 4 numbers for your security PIN';
    } else {
      modalTitle = 'Confirm New 4-Digit Password';
      modalSubtitle = 'Re-enter the 4 numbers to confirm';
    }
  } else if (mode === 'unlock_app') {
    modalTitle = 'SafeGuard Shield Locked';
    modalSubtitle = 'Enter 4-digit security password to unlock';
  }

  return (
    <div
      id="pin-security-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-800/90 bg-slate-900 shadow-2xl p-6 flex flex-col items-center">
        {/* Close Button if permitted */}
        {canCancel && onClose && (
          <button
            id="close-pin-modal-btn"
            onClick={onClose}
            aria-label="Cancel password verification"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Security Shield Icon Emblem */}
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-900/40 text-blue-400 ring-1 ring-blue-500/30 shadow-lg shadow-blue-950/50">
          {successMsg ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          ) : errorMsg ? (
            <ShieldAlert className="h-7 w-7 text-rose-400" />
          ) : (
            <KeyRound className="h-7 w-7 text-blue-400" />
          )}
        </div>

        {/* Header Text */}
        <h3 className="text-base font-bold text-white text-center">{modalTitle}</h3>
        <p className="text-xs text-slate-400 text-center mt-0.5 max-w-[260px]">
          {modalSubtitle}
        </p>

        {/* 4 Digit Indicators */}
        <div
          className={`my-5 flex items-center justify-center space-x-3 transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const hasDigit = pin.length > index;
            const digitChar = hasDigit ? pin[index] : '';

            return (
              <div
                key={index}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200 ${
                  hasDigit
                    ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/20'
                    : 'border-slate-800 bg-slate-950/70 text-slate-600'
                }`}
              >
                {hasDigit ? (
                  showDigits ? (
                    <span className="text-lg font-black font-mono text-blue-300">
                      {digitChar}
                    </span>
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  )
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error / Success Feedback banner */}
        <div className="h-6 flex items-center justify-center mb-2">
          {errorMsg && (
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{successMsg}</span>
            </div>
          )}
        </div>

        {/* Toggle Show/Hide Digits */}
        <div className="w-full flex justify-end px-2 mb-2">
          <button
            type="button"
            onClick={() => setShowDigits(!showDigits)}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
          >
            {showDigits ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Hide Digits</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Show Digits</span>
              </>
            )}
          </button>
        </div>

        {/* Tactical 3x4 Number Keypad (1 to 9, Clear, 0, Backspace) */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              id={`pin-key-${num}`}
              onClick={() => handleKeyPress(num)}
              className="flex h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-base font-bold text-white shadow-sm hover:border-slate-700 hover:bg-slate-800/80 active:scale-95 transition"
            >
              {num}
            </button>
          ))}

          {/* Clear Key */}
          <button
            type="button"
            id="pin-key-clear"
            onClick={handleClear}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 active:scale-95 transition"
          >
            Clear
          </button>

          {/* 0 Key */}
          <button
            type="button"
            id="pin-key-0"
            onClick={() => handleKeyPress(0)}
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-base font-bold text-white shadow-sm hover:border-slate-700 hover:bg-slate-800/80 active:scale-95 transition"
          >
            0
          </button>

          {/* Delete / Backspace Key */}
          <button
            type="button"
            id="pin-key-backspace"
            onClick={handleDelete}
            aria-label="Delete last digit"
            className="flex h-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 active:scale-95 transition"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Default Passcode Hint / Info */}
        <div className="mt-4 text-[11px] text-slate-400 text-center flex items-center space-x-1.5">
          <span>Security Pin: 4 digits (0-9)</span>
          {(!currentPin || currentPin === '1234') && (
            <span className="text-slate-400 font-mono">(Default: 1234)</span>
          )}
        </div>
      </div>
    </div>
  );
};
