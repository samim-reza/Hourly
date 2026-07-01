'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = [
  { label: 'Worker', email: 'worker@hourly.samimreza.me', password: 'Worker@Hourly2026' },
  { label: 'Client', email: 'client@hourly.samimreza.me', password: 'Client@Hourly2026' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-parrot-50 px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-parrot-500 text-2xl font-bold text-white shadow-md shadow-parrot-500/30">
          H
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-parrot-900">Hourly Dashboard</h1>
        <p className="mt-1 text-sm text-parrot-600">View hours, screenshots & activity</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-parrot-200 bg-white p-6 shadow-sm">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-parrot-200 bg-parrot-50/50 px-4 py-3 text-sm text-parrot-900 outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-parrot-200 bg-parrot-50/50 px-4 py-3 text-sm text-parrot-900 outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-parrot-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-parrot-600 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 w-full max-w-sm">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-parrot-500">
          Demo accounts
        </p>
        <div className="flex gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.label}
              type="button"
              onClick={() => fillDemo(account)}
              className="flex-1 rounded-lg border border-parrot-200 bg-white px-3 py-2 text-xs font-medium text-parrot-700 transition hover:border-parrot-400 hover:bg-parrot-50"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
