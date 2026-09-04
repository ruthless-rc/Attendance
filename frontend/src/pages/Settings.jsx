import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  ShieldCheck,
  Clock,
  FileText,
  Save,
  AlertTriangle,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { settingsService } from '../services/api';

const DUPLICATE_OPTIONS = [
  { label: 'One attendance per user per day (Standard)', value: 86400 },
  { label: '1 Hour Window', value: 3600 },
  { label: '30 Minutes Window', value: 1800 },
  { label: '5 Minutes Window', value: 300 },
  { label: '30 Seconds (Testing / High-Frequency)', value: 30 },
];

const LIVENESS_OPTIONS = [
  {
    id: 'passive',
    title: 'Passive Liveness (Recommended)',
    desc: 'Analyzes natural micro-movement and eye openness without interrupting user flow.',
  },
  {
    id: 'active',
    title: 'Active Challenge-Response (High Security)',
    desc: 'Prompts users with randomized actions (e.g., "Turn head left", "Blink") before marking.',
  },
  {
    id: 'none',
    title: 'Fast Mode (Disabled)',
    desc: 'Instant 1-frame verification for maximum check-in throughput at high-density entrances.',
  },
];

const Settings = () => {
  const [formData, setFormData] = useState({
    recognition_threshold: 0.45,
    duplicate_interval_seconds: 86400,
    liveness_mode: 'passive',
    late_cutoff_time: '09:30',
    privacy_consent_text: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getSettings();
        setFormData(data);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await settingsService.updateSettings({
        ...formData,
        recognition_threshold: parseFloat(formData.recognition_threshold),
        duplicate_interval_seconds: parseInt(formData.duplicate_interval_seconds, 10),
      });
      setFeedback({
        type: 'success',
        message: 'System settings updated successfully! All kiosks will apply these policies immediately.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update system settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          System Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure deep-learning recognition thresholds, duplicate protection policies, and biometric privacy
        </p>
      </div>

      {feedback.message && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Recognition Sensitivity */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sliders className="h-4 w-4 text-brand-400" />
            <span>Face Recognition Cosine Similarity Threshold</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Recognition Threshold:</span>
              <span className="font-mono text-sm font-bold text-brand-400">
                {formData.recognition_threshold}
              </span>
            </div>

            <input
              type="range"
              min="0.30"
              max="0.65"
              step="0.01"
              value={formData.recognition_threshold}
              onChange={(e) =>
                setFormData({ ...formData, recognition_threshold: parseFloat(e.target.value) })
              }
              className="w-full accent-brand-500 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0.30 (Forgiving / Low Lighting)</span>
              <span>0.45 (Optimal Standard)</span>
              <span>0.65 (Ultra Strict)</span>
            </div>

            {/* Threshold Warning Box */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Important:</strong> Changing this threshold directly impacts the False Acceptance Rate (FAR) and False Rejection Rate (FRR). A higher value guarantees precision but may reject members in imperfect lighting.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Duplicate Attendance & Late Cutoff */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>Attendance Timing & Duplicate Protection Rules</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Duplicate Attendance Window
              </label>
              <select
                value={formData.duplicate_interval_seconds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duplicate_interval_seconds: parseInt(e.target.value, 10),
                  })
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                {DUPLICATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Prevents marking a person present repeatedly if they linger in front of the camera.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Late Arrival Cutoff Time (24h)
              </label>
              <input
                type="time"
                value={formData.late_cutoff_time}
                onChange={(e) =>
                  setFormData({ ...formData, late_cutoff_time: e.target.value })
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Check-ins stamped after this time will automatically receive the status "LATE".
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Anti-Spoofing / Liveness Policy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Anti-Spoofing & Liveness Verification Mode</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LIVENESS_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.liveness_mode === opt.id
                    ? 'border-brand-500 bg-brand-500/10 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-slate-200">{opt.title}</span>
                    <input
                      type="radio"
                      name="liveness_mode"
                      value={opt.id}
                      checked={formData.liveness_mode === opt.id}
                      onChange={(e) =>
                        setFormData({ ...formData, liveness_mode: e.target.value })
                      }
                      className="text-brand-600 focus:ring-0"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 4: Biometric Privacy Policy & Consent */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>Configurable Biometric Consent Disclaimer</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            This legal disclaimer is shown to all users during face registration to ensure compliance with privacy regulations.
          </p>

          <textarea
            rows={3}
            value={formData.privacy_consent_text}
            onChange={(e) =>
              setFormData({ ...formData, privacy_consent_text: e.target.value })
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
