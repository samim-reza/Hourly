'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@hourly/shared';

interface DashboardShellProps {
  profile: Profile | null;
  isClient: boolean;
  children: React.ReactNode;
}

export function DashboardShell({ profile, isClient, children }: DashboardShellProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hourly-600 text-sm font-bold">
              H
            </div>
            <div>
              <h1 className="text-lg font-semibold">Hourly</h1>
              <p className="text-xs text-slate-400">
                {isClient ? 'Client view (read-only)' : 'Freelancer dashboard'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{profile?.name ?? profile?.email}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
