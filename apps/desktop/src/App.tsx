import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, getProjects, createProject, getProfile } from '@/lib/supabase';
import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/lib/supabase';
import type { Project, Profile } from '@hourly/shared';
import { LoginForm } from '@/components/LoginForm';
import { TimerDisplay } from '@/components/TimerDisplay';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  const timer = useTimer(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProjects([]);
      return;
    }
    getProfile(session.user.id).then(setProfile);
    getProjects(session.user.id).then(setProjects);
  }, [session]);

  const handleCreateProject = async () => {
    if (!session || !newProjectName.trim()) return;
    const project = await createProject(newProjectName.trim(), session.user.id);
    if (project) {
      setProjects((p) => [...p, project]);
      setNewProjectName('');
      timer.setProjectId(project.id);
    }
  };

  const handleSignOut = async () => {
    if (timer.isRunning) await timer.stop();
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parrot-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-parrot-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-parrot-50">
      <header className="border-b border-parrot-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-parrot-500 text-sm font-bold text-white">
              H
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-parrot-900">Hourly</h1>
              <p className="text-xs text-parrot-600">{profile?.name ?? session.user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-parrot-600 transition hover:text-parrot-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 p-5">
        {timer.lastIdleWarning && (
          <div className="rounded-lg border border-feather-400/50 bg-feather-400/10 px-4 py-3 text-sm text-parrot-800">
            Timer auto-paused due to inactivity. Resume when you&apos;re back.
          </div>
        )}

        <section>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-parrot-600">
            Project
          </label>
          <select
            value={timer.projectId ?? ''}
            onChange={(e) => timer.setProjectId(e.target.value)}
            disabled={timer.isRunning}
            className="w-full rounded-lg border border-parrot-200 bg-white px-3 py-2.5 text-sm text-parrot-900 outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200 disabled:opacity-50"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {!timer.isRunning && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="New project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                className="flex-1 rounded-lg border border-parrot-200 bg-white px-3 py-2 text-sm outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200"
              />
              <button
                onClick={handleCreateProject}
                className="rounded-lg bg-parrot-100 px-3 py-2 text-sm font-medium text-parrot-800 transition hover:bg-parrot-200"
              >
                Add
              </button>
            </div>
          )}
        </section>

        <section>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-parrot-600">
            Memo
          </label>
          <textarea
            value={timer.memo}
            onChange={(e) => timer.setMemo(e.target.value)}
            disabled={timer.isRunning && !timer.isPaused}
            placeholder="What are you working on?"
            rows={2}
            className="w-full resize-none rounded-lg border border-parrot-200 bg-white px-3 py-2 text-sm outline-none focus:border-parrot-500 focus:ring-2 focus:ring-parrot-200 disabled:opacity-50"
          />
        </section>

        <TimerDisplay
          elapsed={formatDuration(timer.elapsedMs)}
          activityPercent={timer.activityPercent}
          isRunning={timer.isRunning}
          isPaused={timer.isPaused}
        />

        <div className="mt-auto flex gap-3">
          {!timer.isRunning ? (
            <button
              onClick={() => timer.start()}
              disabled={!timer.projectId}
              className="flex-1 rounded-xl bg-parrot-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-parrot-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start
            </button>
          ) : timer.isPaused ? (
            <>
              <button
                onClick={() => timer.resume()}
                className="flex-1 rounded-xl bg-parrot-500 py-3.5 text-sm font-semibold text-white transition hover:bg-parrot-600"
              >
                Resume
              </button>
              <button
                onClick={() => timer.stop()}
                className="flex-1 rounded-xl border border-parrot-300 bg-white py-3.5 text-sm font-semibold text-parrot-800 transition hover:bg-parrot-50"
              >
                Stop
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => timer.pause()}
                className="flex-1 rounded-xl border border-parrot-300 bg-white py-3.5 text-sm font-semibold text-parrot-800 transition hover:bg-parrot-50"
              >
                Pause
              </button>
              <button
                onClick={() => timer.stop()}
                className="flex-1 rounded-xl bg-red-500 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Stop
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-parrot-500">
          Screenshots every 10 min · Activity counts only (no keylogging)
        </p>
      </main>
    </div>
  );
}
