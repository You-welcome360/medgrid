import React, { useState } from 'react';
import { createFacility, type CreateFacilityPayload } from '@/services/authService';
import { PlusCircle, CheckCircle2, Copy, AlertTriangle, Loader2 } from 'lucide-react';

export default function CreateFacilityPage() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [type, setType] = useState<'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY' | 'SUPPLIER'>('HOSPITAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Storing generated admin credentials on success
  const [successData, setSuccessData] = useState<{
    facilityName: string;
    adminEmail: string;
    initialPass: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !phone || !adminEmail || !type) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessData(null);

    const payload: CreateFacilityPayload = {
      facility_name: name,
      location,
      phone,
      admin_email: adminEmail,
      facility_type: type,
    };

    try {
      const data = await createFacility(payload);

      setSuccessData({
        facilityName: data.facility.name,
        adminEmail: data.admin.email,
        initialPass: data.admin.initial_password,
      });

      // Reset form
      setName('');
      setLocation('');
      setPhone('');
      setAdminEmail('');
      setType('HOSPITAL');
    } catch (err: any) {
      setError(err.message ?? 'Failed to register facility');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-2xl space-y-6 text-slate-800">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-emerald-600" />
          Register New Node
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Add an independent hospital, pharmacy, blood bank, or supply center to the MedGrid network.
        </p>
      </div>

      {successData && (
        <div className="bg-white border border-emerald-200/80 rounded-xl p-6 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <CheckCircle2 className="h-5 w-5" />
            Node Successfully Provisioned!
          </div>
          <p className="text-sm text-slate-650">
            <strong>{successData.facilityName}</strong> is now registered. Please share these administrative credentials with the facility administrator:
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono text-sm relative">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-sans font-bold">Admin Email</span>
              <span className="text-slate-850 font-bold">{successData.adminEmail}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-sans font-bold">Temp Password</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">{successData.initialPass}</span>
                <button
                  onClick={() => copyToClipboard(successData.initialPass)}
                  className="text-slate-400 hover:text-slate-650 cursor-pointer"
                  title="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-750 bg-amber-50 border border-amber-200/80 p-3 rounded-xl font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              This temporary password is only shown once. The administrator will be forced to change it upon their first login.
            </span>
          </div>

          <button
            onClick={() => setSuccessData(null)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
          >
            Create another facility
          </button>
        </div>
      )}

      {/* Form Card */}
      {!successData && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-650 text-xs px-4 py-3 rounded-xl font-medium animate-shake">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Facility Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hope General Hospital"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Facility Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                >
                  <SelectItem value="HOSPITAL" label="Hospital" />
                  <SelectItem value="PHARMACY" label="Pharmacy" />
                  <SelectItem value="BLOOD_BANK" label="Blood Bank" />
                  <SelectItem value="SUPPLIER" label="PPE & Equipment Supplier" />
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Location (Address & Geo Coordinates)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Latitude, Longitude (e.g. 5.6037, -0.1870)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +233240000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">
                Node Administrator Credentials
              </h3>
              <div className="max-w-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. admin@hopehospital.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:translate-y-[1px] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Provisioning Node...
                </>
              ) : (
                'Register Facility'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Simple custom select item wrapper
function SelectItem({ value, label }: { value: string; label: string }) {
  return (
    <option value={value} className="bg-white text-slate-800">
      {label}
    </option>
  );
}
