import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gray-950 p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <span className="text-sm font-bold text-gray-950">M</span>
          </div>
          <span className="text-lg font-semibold text-white">MedGrid</span>
        </div>

        <div>
          <blockquote className="space-y-2">
            <p className="text-3xl font-semibold leading-tight text-white">
              Connecting Healthcare.
              <br />
              Saving Lives.
            </p>
            <p className="text-sm text-gray-400">
              A unified network for healthcare resource coordination.
              <br />
              Secure. Reliable. Real-time.
            </p>
          </blockquote>
        </div>

        <div className="flex gap-8">
          {[
            { value: '250+', label: 'Registered Facilities' },
            { value: '152K+', label: 'Resources Shared' },
            { value: '-45%', label: 'Response Time' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold">MedGrid</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
