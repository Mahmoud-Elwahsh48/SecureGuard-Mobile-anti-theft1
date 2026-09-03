import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Mail,
  Save,
  CheckCircle,
  Camera,
  Volume2,
  Server,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';
import { AlertDispatcher, DispatchResult } from '../utils/alertDispatcher';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onSave: (updated: Partial<SecurityPrefsState>) => void;
  onOpenPinModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  prefs,
  onSave,
  onOpenPinModal,
}) => {
  const [ownerEmail, setOwnerEmail] = useState(prefs.ownerEmail);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState(prefs.alertRecipientEmail);
  const [sendGridApiKey, setSendGridApiKey] = useState(prefs.sendGridApiKey);
  const [emailJsServiceId, setEmailJsServiceId] = useState(prefs.emailJsServiceId);
  const [emailJsTemplateId, setEmailJsTemplateId] = useState(prefs.emailJsTemplateId);
  const [emailJsPublicKey, setEmailJsPublicKey] = useState(prefs.emailJsPublicKey);
  const [autoCapture, setAutoCapture] = useState(prefs.autoCapture);
  const [soundAlert, setSoundAlert] = useState(prefs.soundAlert);
  const [securityPin, setSecurityPin] = useState(prefs.securityPin || '1234');
  const [requirePinToDisarm, setRequirePinToDisarm] = useState(prefs.requirePinToDisarm ?? true);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dynamic Email Dispatch Test State
  const [testEmailRecipient, setTestEmailRecipient] = useState(prefs.alertRecipientEmail || prefs.ownerEmail);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<DispatchResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOwnerEmail(prefs.ownerEmail);
      setAlertRecipientEmail(prefs.alertRecipientEmail);
      setSendGridApiKey(prefs.sendGridApiKey);
      setEmailJsServiceId(prefs.emailJsServiceId);
      setEmailJsTemplateId(prefs.emailJsTemplateId);
      setEmailJsPublicKey(prefs.emailJsPublicKey);
      setAutoCapture(prefs.autoCapture);
      setSoundAlert(prefs.soundAlert);
      setSecurityPin(prefs.securityPin || '1234');
      setRequirePinToDisarm(prefs.requirePinToDisarm ?? true);
      setShowPin(false);
      setPinError(null);
      setSavedSuccess(false);
      setTestEmailRecipient(prefs.alertRecipientEmail || prefs.ownerEmail);
      setTestResult(null);
    }
  }, [isOpen, prefs]);

  const handlePinInputChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    setSecurityPin(numeric);
    if (numeric.length > 0 && numeric.length < 4) {
      setPinError('PIN must be exactly 4 numbers');
    } else {
      setPinError(null);
    }
  };

  const handleSendTestEmail = async () => {
    const target = testEmailRecipient.trim() || alertRecipientEmail.trim() || ownerEmail.trim();
    if (!target) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const activePrefs: SecurityPrefsState = {
        ...prefs,
        ownerEmail: ownerEmail.trim(),
        alertRecipientEmail: alertRecipientEmail.trim(),
        sendGridApiKey: sendGridApiKey.trim(),
        emailJsServiceId: emailJsServiceId.trim(),
        emailJsTemplateId: emailJsTemplateId.trim(),
        emailJsPublicKey: emailJsPublicKey.trim(),
      };

      const res = await AlertDispatcher.sendDynamicTestEmail(
        target,
        activePrefs,
        'Dynamic alert verification test from SafeGuard Shield Settings.'
      );
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        method: 'Email Dispatch Error',
        message: e?.message || 'Failed to dispatch email test',
        timestamp: Date.now(),
        recipient: target,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPin.length !== 4) {
      setPinError('Security PIN must consist of exactly 4 numbers');
      return;
    }

    onSave({
      ownerEmail: ownerEmail.trim(),
      alertRecipientEmail: alertRecipientEmail.trim(),
      sendGridApiKey: sendGridApiKey.trim(),
      emailJsServiceId: emailJsServiceId.trim(),
      emailJsTemplateId: emailJsTemplateId.trim(),
      emailJsPublicKey: emailJsPublicKey.trim(),
      autoCapture,
      soundAlert,
      securityPin: securityPin.trim(),
      requirePinToDisarm,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Security Configuration</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Encrypted Alerts & Dynamic Email Setup</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {savedSuccess && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Security settings successfully saved!</span>
            </div>
          )}

          {/* Email Recipients Section */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Mail className="h-4 w-4 text-blue-400" />
              <span>Dynamic Email Alert Recipients</span>
            </div>

            {/* Owner Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Owner Email Address
              </label>
              <input
                id="ownerEmail-input"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm sm:text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Alert Recipient Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Dynamic Incident Alert Destination Email
              </label>
              <input
                id="alertRecipient-input"
                type="email"
                value={alertRecipientEmail}
                onChange={(e) => setAlertRecipientEmail(e.target.value)}
                placeholder="alerts@example.com"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm sm:text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                All real-time breach notifications & stealth photos are dynamically dispatched to this address.
              </p>
            </div>
          </div>

          {/* 4-Digit Security Password Configuration */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <KeyRound className="h-4 w-4 text-blue-400" />
                <span>4-Digit Security Password (PIN)</span>
              </div>
              {onOpenPinModal && (
                <button
                  type="button"
                  id="open-pin-pad-btn"
                  onClick={onOpenPinModal}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/30 transition active:scale-95"
                >
                  Keypad Test
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                Passcode (4 numbers 0-9)
              </label>
              <div className="relative">
                <input
                  id="security-pin-input"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={securityPin}
                  onChange={(e) => handlePinInputChange(e.target.value)}
                  placeholder="1234"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-base text-slate-100 font-mono tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] text-rose-400 mt-1 font-medium">{pinError}</p>
              )}
            </div>

            {/* Require PIN to Disarm Shield */}
            <label className="flex items-center justify-between pt-1 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-slate-200">Require PIN to Disarm</div>
                  <div className="text-[10px] text-slate-400">Prompts for 4-digit code before disarming</div>
                </div>
              </div>
              <input
                id="require-pin-toggle"
                type="checkbox"
                checked={requirePinToDisarm}
                onChange={(e) => setRequirePinToDisarm(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* EmailJS Configuration Section */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white">
                <Server className="h-4 w-4 text-purple-400" />
                <span>EmailJS Dynamic Dispatch Engine</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Active Service
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Service ID</label>
                <input
                  id="emailjs-service-id"
                  type="text"
                  value={emailJsServiceId}
                  onChange={(e) => setEmailJsServiceId(e.target.value)}
                  placeholder="service_i42p396"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">Template ID</label>
                <input
                  id="emailjs-template-id"
                  type="text"
                  value={emailJsTemplateId}
                  onChange={(e) => setEmailJsTemplateId(e.target.value)}
                  placeholder="template_n69o5ue"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-medium mb-1">
                EmailJS Public Key
              </label>
              <input
                id="emailjs-public-key"
                type="text"
                value={emailJsPublicKey}
                onChange={(e) => setEmailJsPublicKey(e.target.value)}
                placeholder="Tm2xBGIqxUeDSy_A2"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none font-mono"
              />
            </div>

            {/* Dynamic Test Email Dispatch Tool */}
            <div className="pt-2 border-t border-purple-500/20 space-y-2">
              <label className="block text-[11px] font-semibold text-purple-300">
                Send Dynamic Test Email Now
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="dynamic-test-email-input"
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="dynamic-recipient@example.com"
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  id="send-dynamic-test-email-btn"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmailRecipient.trim()}
                  className="flex items-center justify-center space-x-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 text-xs font-semibold shadow transition disabled:opacity-50 active:scale-95 shrink-0"
                >
                  {isSendingTest ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{isSendingTest ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl border p-2.5 text-xs ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                    {testResult.success ? (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.method}</span>
                  </div>
                  <p className="text-[11px] opacity-90 break-words">{testResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Preferences Toggles */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 cursor-pointer hover:bg-slate-950 min-h-[44px]">
              <div className="flex items-center space-x-2.5">
                <Camera className="h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Auto Stealth Photo Capture</div>
                  <div className="text-[11px] text-slate-500">Take front snapshot on trigger</div>
                </div>
              </div>
              <input
                id="auto-capture-toggle"
                type="checkbox"
                checked={autoCapture}
                onChange={(e) => setAutoCapture(e.target.checked)}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 cursor-pointer hover:bg-slate-950 min-h-[44px]">
              <div className="flex items-center space-x-2.5">
                <Volume2 className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Security Alert Chime</div>
                  <div className="text-[11px] text-slate-500">Play audio chime on trigger detection</div>
                </div>
              </div>
              <input
                id="sound-alert-toggle"
                type="checkbox"
                checked={soundAlert}
                onChange={(e) => setSoundAlert(e.target.checked)}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Footer Save */}
          <div className="pt-3 flex justify-end space-x-2.5 border-t border-slate-800/80">
            <button
              type="button"
              id="cancel-settings-btn"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95 min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-settings-btn"
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 active:scale-95 min-h-[40px]"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

