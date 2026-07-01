'use client';

interface Entry {
  id: string;
  project_id: string;
  start: string;
  end: string | null;
  duration_seconds: number;
  memo: string | null;
  status: string;
  projects?: { name: string };
}

interface TimeEntriesTableProps {
  entries: Entry[];
  isClient: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TimeEntriesTable({ entries, isClient }: TimeEntriesTableProps) {
  const exportCsv = () => {
    const headers = ['Project', 'Start', 'End', 'Duration (min)', 'Memo', 'Status'];
    const rows = entries.map((e) => [
      e.projects?.name ?? e.project_id,
      e.start,
      e.end ?? '',
      String(Math.round(e.duration_seconds / 60)),
      e.memo ?? '',
      e.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hourly-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-parrot-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-parrot-100 px-5 py-4">
        <h2 className="font-semibold text-parrot-900">Recent time entries</h2>
        {!isClient && entries.length > 0 && (
          <button
            onClick={exportCsv}
            className="rounded-lg bg-parrot-100 px-3 py-1.5 text-xs font-medium text-parrot-800 transition hover:bg-parrot-200"
          >
            Export CSV
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-parrot-500">
          No time entries yet. Start tracking with the Hourly desktop app.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-parrot-100 text-left text-xs uppercase tracking-wider text-parrot-500">
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Start</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Memo</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-parrot-50 hover:bg-parrot-50/50">
                  <td className="px-5 py-3 font-medium text-parrot-900">{entry.projects?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-parrot-600">{formatDate(entry.start)}</td>
                  <td className="px-5 py-3 font-mono text-parrot-800">{formatDuration(entry.duration_seconds)}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-parrot-600">{entry.memo ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.status === 'running'
                          ? 'bg-parrot-200 text-parrot-800'
                          : entry.status === 'paused'
                            ? 'bg-feather-400/30 text-parrot-800'
                            : 'bg-parrot-100 text-parrot-600'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
