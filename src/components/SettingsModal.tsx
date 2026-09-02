import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Mail,
  Key,
  Shield,
  Save,
  CheckCircle,
  Camera,
  Volume2,
  Server,
  Info,
} from 'lucide-react';
import { SecurityPrefsState } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: SecurityPrefsState;
  onSave: (updated: Partial<SecurityPrefsState>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  prefs,
  onSave,
}) => {
  const [ownerEmail, setOwnerEmail] = useState(prefs.ownerEmail);
  const [alertRecipientEmail, setAlertRecipientEmail] = useState(prefs.alertRecipientEmail);
  const [sendGridApiKey, setSendGridApiKey] = useState(prefs.sendGridApiKey);
  const [emailJsServiceId, setEmailJsServiceId] = useState(prefs.emailJsServiceId);
  const [emailJsTemplateId, setEmailJsTemplateId] = useState(prefs.emailJsTemplateId);
  const [emailJsPublicKey, setEmailJsPublicKey] = useState(prefs.emailJsPublicKey);
  const [autoCapture, setAutoCapture] = useState(prefs.autoCapture);
  const [soundAlert, setSoundAlert] = useState(prefs.soundAlert);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
      setSavedSuccess(false);
    }
  }, [isOpen, prefs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ownerEmail: ownerEmail.trim(),
      alertRecipientEmail: alertRecipientEmail.trim(),
      sendGridApiKey: sendGridApiKey.trim(),
      emailJsServiceId: emailJsServiceId.trim(),
      emailJsTemplateId: emailJsTemplateId.trim(),
      emailJsPublicKey: emailJsPublicKey.trim(),
      autoCapture,
      soundAlert,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">SafeGuard Security Configuration</h3>
              <p className="text-xs text-slate-400">Encrypted Preferences & Alert Dispatch Setup</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {savedSuccess && (
            <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Security settings successfully saved!</span>
            </div>
          )}

          {/* Owner Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              <span>Owner Email</span>
            </label>
            <input
              id="ownerEmail-input"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@example.com"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Alert Recipient Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              <span>Alert Recipient Email</span>
            </label>
            <input
              id="alertRecipient-input"
              type="email"
              value={alertRecipientEmail}
              onChange={(e) => setAlertRecipientEmail(e.target.value)}
              placeholder="alerts@example.com"
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* SendGrid API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>SendGrid API Key (Optional)</span>
            </label>
            <input
              id="apiKey-input"
              type="password"
              value={sendGridApiKey}
              onChange={(e) => setSendGridApiKey(e.target.value)}
              placeholder="SG.xxxxxxxxxxxxxxx"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* EmailJS Configuration Section */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Server className="h-3.5 w-3.5 text-purple-400" />
              <span>EmailJS Web Service Config</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Service ID</label>
                <input
                  id="emailjs-service-id"
                  type="text"
                  value={emailJsServiceId}
                  onChange={(e) => setEmailJsServiceId(e.target.value)}
                  placeholder="service_pegyggo"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Template ID</label>
                <input
                  id="emailjs-template-id"
                  type="text"
                  value={emailJsTemplateId}
                  onChange={(e) => setEmailJsTemplateId(e.target.value)}
                  placeholder="template_safeguard"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Public Key (Optional)</label>
              <input
                id="emailjs-public-key"
                type="password"
                value={emailJsPublicKey}
                onChange={(e) => setEmailJsPublicKey(e.target.value)}
                placeholder="YOUR_PUBLIC_KEY"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Additional Preferences Toggles */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 cursor-pointer hover:bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <Camera className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Auto Stealth Photo Capture</div>
                  <div className="text-[11px] text-slate-500">Take front snapshot automatically when triggers fire</div>
                </div>
              </div>
              <input
                id="auto-capture-toggle"
                type="checkbox"
                checked={autoCapture}
                onChange={(e) => setAutoCapture(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 cursor-pointer hover:bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <Volume2 className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Security Alert Chime</div>
                  <div className="text-[11px] text-slate-500">Play audio sound on unauthorized trigger detection</div>
                </div>
              </div>
              <input
                id="sound-alert-toggle"
                type="checkbox"
                checked={soundAlert}
                onChange={(e) => setSoundAlert(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Footer Save */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              id="cancel-settings-btn"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-settings-btn"
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
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
