import React, { useState, useEffect } from 'react';
import { createManager, getManagers, deactivateManager, type CreateManagerPayload } from '@/services/authService';
import type { Manager } from '@/types/auth';
import { Users, UserPlus, Trash2, CheckCircle2, Copy, AlertTriangle, Loader2 } from 'lucide-react';

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'inventory_manager' | 'coordination_manager'>('inventory_manager');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invited credentials popup state
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    role: string;
    initialPass: string;
  } | null>(null);

  const fetchManagers = async () => {
    setFetching(true);
    try {
      const data = await getManagers();
      setManagers(data.managers);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load managers');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) {
      setError('Please provide email and role');
      return;
    }

    setLoading(true);
    setError(null);
    setInviteResult(null);

    const payload: CreateManagerPayload = { email, role };

    try {
      const data = await createManager(payload);
      setInviteResult({
        email: data.manager.email,
        role: data.manager.role,
        initialPass: data.manager.initial_password,
      });

      setEmail('');
      setRole('inventory_manager');
      fetchManagers(); // reload table list
    } catch (err: any) {
      setError(err.message ?? 'Failed to invite manager');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this manager?')) return;

    try {
      await deactivateManager(id);
      fetchManagers();
    } catch (err: any) {
      alert(err.message ?? 'Failed to deactivate manager');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Facility Personnel Desk
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage local operators, inventory clerks, and coordination managers for your facility node.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invitation Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              Invite Manager
            </h3>

            {inviteResult && (
              <div className="bg-slate-50 p-4 border border-slate-200/80 rounded-xl space-y-3 mb-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  Invitation Active!
                </div>
                <div className="text-xs text-slate-700 font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="font-sans font-bold text-slate-500">Email</span>
                    <span className="text-slate-850 font-bold">{inviteResult.email}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200/60">
                    <span className="font-sans font-bold text-slate-500">Password</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">{inviteResult.initialPass}</span>
                      <button
                        onClick={() => copyToClipboard(inviteResult.initialPass)}
                        className="text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/40 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>Password resets mandatory on first sign in.</span>
                </div>
                <button
                  onClick={() => setInviteResult(null)}
                  className="w-full py-2 text-center text-xs bg-white hover:bg-slate-105 border border-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Invite another
                </button>
              </div>
            )}

            {!inviteResult && (
              <form onSubmit={handleInvite} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-655 text-xs px-3 py-2 rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Manager Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. clerk@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Responsibility Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  >
                    <option value="inventory_manager" className="bg-white text-slate-800">
                      Inventory Manager
                    </option>
                    <option value="coordination_manager" className="bg-white text-slate-800">
                      Coordination Manager
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:translate-y-[1px] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Inviting...
                    </>
                  ) : (
                    'Invite Personnel'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Managers Table List */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Active Staff
              </h3>
            </div>

            {fetching ? (
              <div className="p-12 flex items-center justify-center gap-2 text-slate-400 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Retrieving registry...
              </div>
            ) : managers.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400 font-medium">
                No managers added yet. Invite someone using the panel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">First Login</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {managers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {m.email}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                            m.role === 'INVENTORY_MANAGER'
                              ? 'bg-cyan-50 text-cyan-750 border-cyan-200/40'
                              : 'bg-indigo-50 text-indigo-755 border-indigo-200/40'
                          }`}>
                            {m.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {m.isFirstLogin ? (
                            <span className="text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]">
                              Pending Reset
                            </span>
                          ) : (
                            <span className="text-emerald-650 bg-emerald-55 border border-emerald-250/60 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeactivate(m.id)}
                            className="text-red-650 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer"
                            title="Deactivate staff"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
