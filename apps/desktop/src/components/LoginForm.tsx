import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const DEMO_WORKER = {
  email: 'worker@hourly.samimreza.me',
  password: 'Worker@Hourly2026',
};

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role: 'freelancer' } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-parrot-50 px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-parrot-500 text-2xl font-bold text-white shadow-md shadow-parrot-500/30">
          H
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-parrot-900">Hourly</h1>
        <p className="mt-1 text-sm text-parrot-600">Track time with proof of work</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-parrot-200 bg-white p-6 shadow-sm">
        {isSignUp && (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-parrot-200 bg-parrot-50/50 px-4 py-3 text-sm outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-parrot-200 bg-parrot-50/50 px-4 py-3 text-sm outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-lg border border-parrot-200 bg-parrot-50/50 px-4 py-3 text-sm outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-parrot-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-parrot-600 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {!isSignUp && (
        <button
          type="button"
          onClick={() => {
            setEmail(DEMO_WORKER.email);
            setPassword(DEMO_WORKER.password);
          }}
          className="mt-4 text-sm text-parrot-600 underline-offset-2 transition hover:text-parrot-800 hover:underline"
        >
          Use demo worker account
        </button>
      )}

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-3 text-sm text-parrot-500 transition hover:text-parrot-700"
      >
        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
    </div>
  );
}
