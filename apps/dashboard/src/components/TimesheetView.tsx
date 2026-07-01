'use client';

import { useMemo, useState } from 'react';
import type { Profile, Project, TimeEntry, ActivityLog, Screenshot } from '@hourly/shared';

interface TimesheetViewProps {
  profile: Profile | null;
  projects: Project[];
  entries: TimeEntry[];
  activityLogs: ActivityLog[];
  screenshots: (Screenshot & { url: string | null })[];
  isClient: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TimesheetView({
  profile,
  projects,
  entries,
  activityLogs,
  screenshots,
  isClient,
}: TimesheetViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const filteredEntries = useMemo(() => {
    if (selectedProject === 'all') return entries;
    return entries.filter((e) => e.project_id === selectedProject);
  }, [entries, selectedProject]);

  const totalSeconds = filteredEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
  const hourlyRate = profile?.hourly_rate ?? 0;
  const totalEarnings = (totalSeconds / 3600) * Number(hourlyRate);

  const avgActivity = useMemo(() => {
    const entryIds = new Set(filteredEntries.map((e) => e.id));
    const logs = activityLogs.filter((l) => entryIds.has(l.time_entry_id));
    if (logs.length === 0) return 0;
    return Math.round(logs.reduce((s, l) => s + Number(l.activity_percent), 0) / logs.length);
  }, [filteredEntries, activityLogs]);

  const exportCsv = () => {
    const headers = ['Project', 'Start', 'End', 'Duration (h)', 'Memo', 'Status'];
    const rows = filteredEntries.map((e) => [
      projectMap[e.project_id] ?? e.project_id,
      e.start,
      e.end ?? '',
      (e.duration_seconds / 3600).toFixed(2),
      e.memo ?? '',
      e.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hourly-timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Weekly Timesheet</h2>
          <p className="text-sm text-slate-400">Last 7 days of tracked time</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-hourly-500"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!isClient && (
            <button
              onClick={exportCsv}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total hours" value={formatDuration(totalSeconds)} />
        <StatCard label="Avg activity" value={`${avgActivity}%`} />
        <StatCard
          label="Earnings"
          value={hourlyRate > 0 ? `$${totalEarnings.toFixed(2)}` : '—'}
          sub={hourlyRate > 0 ? `@ $${hourlyRate}/hr` : 'Set hourly rate in profile'}
        />
      </div>

      <section>
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
          Time entries
        </h3>
        {filteredEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            No time entries this week. Start tracking with the Hourly desktop app.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-medium">
                      {projectMap[entry.project_id] ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(entry.start)}</td>
                    <td className="px-4 py-3 font-mono">{formatDuration(entry.duration_seconds)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-400">{entry.memo ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {screenshots.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
            Screenshots
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.slice(0, 12).map((shot) => (
              <div key={shot.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                {shot.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt="Work screenshot" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-slate-600">Unavailable</div>
                )}
                <p className="px-3 py-2 text-xs text-slate-500">{formatDate(shot.taken_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    stopped: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.stopped}`}>
      {status}
    </span>
  );
}
