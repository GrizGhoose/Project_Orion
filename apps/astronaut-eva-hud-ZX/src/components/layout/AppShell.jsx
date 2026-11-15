import { Outlet } from 'react-router';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-space text-slate-100">
      <a href="#main-content" className="skip-link">
        Skip to helmet display
      </a>
      <Outlet />
    </div>
  );
}
