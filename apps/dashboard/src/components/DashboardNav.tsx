import Link from 'next/link';
import { SignOutButton } from './SignOutButton';
import type { Profile } from '@hourly/shared';

interface DashboardNavProps {
  profile: Profile | null;
  isClient: boolean;
}

export function DashboardNav({ profile, isClient }: DashboardNavProps) {
  return (
    <header className="border-b border-parrot-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-parrot-500 text-sm font-bold text-white">
              H
            </div>
            <span className="font-semibold text-parrot-900">Hourly</span>
          </Link>
          {isClient && (
            <span className="rounded-full bg-feather-400/20 px-2.5 py-0.5 text-xs font-medium text-parrot-700">
              Client view
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-parrot-600">{profile?.name ?? profile?.email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
