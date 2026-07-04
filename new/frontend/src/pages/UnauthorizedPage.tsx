import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 mb-6">
          You do not have the required permissions to view this resource.
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-2.5 rounded-xl transition-all duration-150"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
