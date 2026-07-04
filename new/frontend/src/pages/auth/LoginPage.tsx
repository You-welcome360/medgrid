import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/authService';
import { Eye, EyeOff, Loader2, Globe, Activity, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await login(email.includes('@') ? email : `${email}@medgrid.com`, password);

      localStorage.setItem('medgrid_token', data.token);
      localStorage.setItem('medgrid_user', JSON.stringify(data.user));

      if (data.user.is_first_login) {
        navigate('/reset-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      {/* Left Panel - Brand & Visual Showcase (Only visible on large screens) */}
      <div className="hidden lg:flex lg:col-span-5 bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        {/* Abstract network graphic decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="50%" cy="50%" r="200" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            <circle cx="50%" cy="50%" r="100" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 100,100 L 300,400 M 300,100 L 100,400" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Glow point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/MEDGRID-logo.png" alt="MedGrid Logo" className="h-9 object-contain brightness-0 invert" />
        </div>

        {/* Center Headline */}
        <div className="relative z-10 my-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-slate-100">
            A unified network for healthcare resource coordination.
          </h1>
          <p className="text-slate-400 text-lg">
            Secure, decentralized ledger ensuring local resource optimization and lightning-fast logistics exchange.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Globe className="h-3.5 w-3.5" /> Secure Ledger
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
              <Activity className="h-3.5 w-3.5" /> Real-time Sync
            </div>
          </div>
        </div>

        {/* Bottom stats / branding */}
        <div className="relative z-10 border-t border-slate-800/60 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-slate-100">250+</p>
              <p className="text-xs text-slate-400">Connected Facilities</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">12K+</p>
              <p className="text-xs text-slate-400">Resources Managed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Sign In Interface */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-md">
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="lg:hidden mb-4">
              <img src="/MEDGRID-logo.png" alt="MedGrid Logo" className="h-10 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
            <p className="text-sm text-slate-500">Sign in to your account to manage local resources</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="text"
                placeholder="admin@medgrid.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                className="h-4 w-4 text-emerald-600 border-slate-350 rounded focus:ring-emerald-500"
              />
              <label htmlFor="remember_me" className="ml-2 block text-xs font-medium text-slate-500">
                Remember my login credentials
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:translate-y-[1px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            Want to register a new facility?{' '}
            <span className="font-semibold text-slate-700">Contact a Super Administrator.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

