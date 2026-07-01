'use client';

interface Entry {
  start: string;
  duration_seconds: number;
}

interface WeeklyTimesheetProps {
  entries: Entry[];
  hourlyRate: number;
  isClient: boolean;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function WeeklyTimesheet({ entries, hourlyRate, isClient }: WeeklyTimesheetProps) {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekEntries = entries.filter((e) => {
    const start = new Date(e.start);
    return start >= weekStart && start < weekEnd;
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  const hoursByDay = days.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const seconds = weekEntries
      .filter((e) => {
        const start = new Date(e.start);
        return start >= day && start < dayEnd;
      })
      .reduce((sum, e) => sum + e.duration_seconds, 0);
    return seconds / 3600;
  });

  const weekTotal = hoursByDay.reduce((a, b) => a + b, 0);
  const maxHours = Math.max(...hoursByDay, 1);

  return (
    <div className="rounded-xl border border-parrot-200 bg-white shadow-sm">
      <div className="border-b border-parrot-100 px-5 py-4">
        <h2 className="font-semibold text-parrot-900">This week</h2>
        <p className="mt-0.5 text-xs text-parrot-500">
          {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
          {new Date(weekEnd.getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="font-mono text-3xl font-semibold text-parrot-900">{weekTotal.toFixed(1)}h</p>
            <p className="text-xs text-parrot-500">Total this week</p>
          </div>
          {!isClient && hourlyRate > 0 && (
            <div className="text-right">
              <p className="font-mono text-xl font-semibold text-parrot-600">
                ${(weekTotal * hourlyRate).toFixed(2)}
              </p>
              <p className="text-xs text-parrot-500">@${hourlyRate}/hr</p>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          {days.map((day, i) => (
            <div key={day.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end rounded-t bg-parrot-50">
                <div
                  className="w-full rounded-t bg-parrot-500 transition-all"
                  style={{ height: `${(hoursByDay[i] / maxHours) * 100}%`, minHeight: hoursByDay[i] > 0 ? '4px' : '0' }}
                  title={`${hoursByDay[i].toFixed(1)}h`}
                />
              </div>
              <span className="text-[10px] text-parrot-500">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
