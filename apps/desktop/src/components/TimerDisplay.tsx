interface TimerDisplayProps {
  elapsed: string;
  activityPercent: number;
  isRunning: boolean;
  isPaused: boolean;
}

export function TimerDisplay({ elapsed, activityPercent, isRunning, isPaused }: TimerDisplayProps) {
  const statusLabel = isPaused ? 'Paused' : isRunning ? 'Tracking' : 'Ready';
  const statusColor = isPaused
    ? 'text-feather-500'
    : isRunning
      ? 'text-parrot-600'
      : 'text-parrot-400';

  return (
    <div className="rounded-2xl border border-parrot-200 bg-white p-6 text-center shadow-sm">
      <p className={`mb-2 text-xs font-medium uppercase tracking-widest ${statusColor}`}>
        {statusLabel}
      </p>
      <p className="font-mono text-5xl font-semibold tracking-tight text-parrot-900">{elapsed}</p>

      {isRunning && (
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs text-parrot-600">
            <span>Activity</span>
            <span>{activityPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-parrot-100">
            <div
              className="h-full rounded-full bg-parrot-500 transition-all duration-500"
              style={{ width: `${activityPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
