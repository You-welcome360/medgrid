import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Save, CheckCircle2, Mail, Smartphone, Globe } from 'lucide-react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/userService';
import type { NotificationPreference } from '@/types';

interface ChannelState {
  enabled: boolean;
  emergency_only: boolean;
}

const CHANNEL_META: Record<string, { label: string; description: string; icon: React.ReactNode; editable: boolean }> = {
  websocket: {
    label: 'In-App (WebSocket)',
    description: 'Real-time alerts inside the dashboard. Always active.',
    icon: <Globe className="h-4 w-4 text-emerald-600" />,
    editable: false,
  },
  push: {
    label: 'Push Notifications',
    description: 'Browser push alerts for important events, especially emergencies.',
    icon: <Smartphone className="h-4 w-4 text-blue-600" />,
    editable: true,
  },
  email: {
    label: 'Email Notifications',
    description: 'Receive updates and alerts via email.',
    icon: <Mail className="h-4 w-4 text-violet-600" />,
    editable: true,
  },
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, ChannelState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then((data) => {
        const map: Record<string, ChannelState> = {};
        data.preferences.forEach((p: NotificationPreference) => {
          map[p.channel.toLowerCase()] = {
            enabled: p.enabled,
            emergency_only: p.emergency_only,
          };
        });
        setPrefs(map);
      })
      .catch((err) => setError(err.message ?? 'Failed to load preferences'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (channel: string, field: 'enabled' | 'emergency_only') => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: !prev[channel]?.[field],
      },
    }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateNotificationPreferences({
        push: prefs.push,
        email: prefs.email,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6 text-slate-800">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-600" />
          Notification Preferences
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Control which channels deliver system alerts and request updates to you.
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading preferences...
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channel</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16 text-center">Enabled</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-center">Emergency Only</span>
          </div>

          {['websocket', 'push', 'email'].map((channel, i) => {
            const meta = CHANNEL_META[channel];
            const state = prefs[channel] ?? { enabled: true, emergency_only: false };
            const isEditable = meta.editable;
            return (
              <div
                key={channel}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-5 ${
                  i < 2 ? 'border-b border-slate-100' : ''
                } ${!isEditable ? 'opacity-60' : ''}`}
              >
                {/* Channel info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{meta.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{meta.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                  </div>
                </div>

                {/* Enabled toggle */}
                <div className="flex justify-center w-16">
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => isEditable && toggle(channel, 'enabled')}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                      state.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                    } ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        state.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Emergency Only toggle */}
                <div className="flex justify-center w-24">
                  <button
                    type="button"
                    disabled={!isEditable || !state.enabled}
                    onClick={() => isEditable && state.enabled && toggle(channel, 'emergency_only')}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                      state.emergency_only && state.enabled ? 'bg-red-500' : 'bg-slate-300'
                    } ${isEditable && state.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        state.emergency_only && state.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              {success && (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Preferences saved.
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Preferences
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 text-xs text-slate-500 font-medium space-y-1">
        <p><strong className="text-slate-700">Emergency Only:</strong> When enabled, that channel only delivers notifications for emergency requests and critical balance alerts.</p>
        <p><strong className="text-slate-700">WebSocket:</strong> In-app alerts are always active and cannot be disabled.</p>
      </div>
    </div>
  );
}
