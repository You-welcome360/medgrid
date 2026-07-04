import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Navigation,
  Edit2,
  Save,
  X,
  Loader2,
  ExternalLink,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getProfile, updateProfile } from '@/services/facilityService';
import type { FacilityProfile } from '@/services/facilityService';

const FACILITY_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  BLOOD_BANK: 'Blood Bank',
  PHARMACY: 'Pharmacy',
  SUPPLIER: 'Supplier',
};

const FACILITY_TYPE_COLORS: Record<string, string> = {
  HOSPITAL: 'bg-blue-50 text-blue-700 border-blue-200',
  BLOOD_BANK: 'bg-red-50 text-red-700 border-red-200',
  PHARMACY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUPPLIER: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function FacilityProfilePage() {
  const userStr = localStorage.getItem('medgrid_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isFacilityAdmin = user?.role === 'FACILITY_ADMIN';

  const [profile, setProfile] = useState<FacilityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formLocation, setFormLocation] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setFormLocation(p.location);
        setFormPhone(p.phone);
        setFormLat(p.latitude !== null ? String(p.latitude) : '');
        setFormLng(p.longitude !== null ? String(p.longitude) : '');
      })
      .catch(() => setError('Failed to load facility profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => {
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  };

  const handleCancel = () => {
    if (!profile) return;
    setFormLocation(profile.location);
    setFormPhone(profile.phone);
    setFormLat(profile.latitude !== null ? String(profile.latitude) : '');
    setFormLng(profile.longitude !== null ? String(profile.longitude) : '');
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const latVal = formLat.trim() === '' ? null : parseFloat(formLat);
    const lngVal = formLng.trim() === '' ? null : parseFloat(formLng);

    if (formLat.trim() !== '' && (isNaN(latVal!) || latVal! < -90 || latVal! > 90)) {
      setSaveError('Latitude must be between -90 and 90.');
      setSaving(false);
      return;
    }
    if (formLng.trim() !== '' && (isNaN(lngVal!) || lngVal! < -180 || lngVal! > 180)) {
      setSaveError('Longitude must be between -180 and 180.');
      setSaving(false);
      return;
    }

    try {
      const updated = await updateProfile({
        location: formLocation.trim() || undefined,
        phone: formPhone.trim() || undefined,
        latitude: latVal,
        longitude: lngVal,
      });
      setProfile(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const mapsUrl =
    profile &&
    profile.latitude !== null &&
    profile.longitude !== null
      ? `https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading facility profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center py-24 text-red-500 gap-3">
        <AlertCircle className="h-5 w-5" />
        {error ?? 'Facility not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Facility Profile
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isFacilityAdmin
              ? 'View and edit your facility details, including location coordinates for the emergency board.'
              : 'View your facility details. Contact your Facility Admin to make changes.'}
          </p>
        </div>

        {isFacilityAdmin && !editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Profile updated successfully.
        </div>
      )}

      {/* Identity card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Building2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900 truncate">{profile.name}</h3>
            <span
              className={`inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                FACILITY_TYPE_COLORS[profile.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {FACILITY_TYPE_LABELS[profile.type] ?? profile.type}
            </span>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Balance</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              ₵{profile.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Calendar className="h-3.5 w-3.5" />
          Registered {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          <span className="ml-auto font-mono text-slate-300">{profile.id.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Details / Edit form */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact &amp; Location</p>

        {saveError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Location / Address
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. 12 Hospital Road, Accra"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. +233 20 000 0000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="e.g. 5.6037"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Range: -90 to 90</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                  placeholder="e.g. -0.1870"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Range: -180 to 180</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/60 text-amber-700 px-3 py-2.5 rounded-xl text-xs font-medium">
              <strong>Tip:</strong> Latitude and longitude power the Emergency Board distance filter. Get coordinates from{' '}
              <a
                href="https://www.latlong.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900"
              >
                latlong.net
              </a>{' '}
              or right-click your location on Google Maps.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            <InfoRow icon={<MapPin className="h-4 w-4 text-slate-400" />} label="Location">
              {profile.location || <span className="text-slate-400 italic">Not set</span>}
            </InfoRow>

            <InfoRow icon={<Phone className="h-4 w-4 text-slate-400" />} label="Phone">
              {profile.phone || <span className="text-slate-400 italic">Not set</span>}
            </InfoRow>

            <InfoRow icon={<Navigation className="h-4 w-4 text-slate-400" />} label="Coordinates">
              {profile.latitude !== null && profile.longitude !== null ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                  </span>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on Map
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-amber-600 text-sm font-semibold italic">
                  Not set — required for the Emergency Board
                </span>
              )}
            </InfoRow>

            <InfoRow icon={<Wallet className="h-4 w-4 text-slate-400" />} label="Current Balance">
              <span className="font-bold text-slate-900">
                ₵{profile.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </InfoRow>
          </div>
        )}
      </div>

      {/* Missing coordinates warning */}
      {!editing && (profile.latitude === null || profile.longitude === null) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/70 px-4 py-4 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Coordinates not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Without latitude and longitude, this facility won't appear on the Emergency Board and cannot
              receive nearby emergency broadcasts.{' '}
              {isFacilityAdmin
                ? 'Click "Edit Profile" to add your coordinates.'
                : 'Ask your Facility Admin to set them.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm text-slate-800 font-semibold">{children}</div>
      </div>
    </div>
  );
}
