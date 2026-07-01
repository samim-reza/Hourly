import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { StatsCards } from '@/components/StatsCards';
import { TimeEntriesTable } from '@/components/TimeEntriesTable';
import { ScreenshotsGallery } from '@/components/ScreenshotsGallery';
import { WeeklyTimesheet } from '@/components/WeeklyTimesheet';
import type { Profile } from '@hourly/shared';
import { withSignedScreenshotUrls } from '@/lib/screenshots';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const typedProfile = profile as Profile | null;
  const isClient = typedProfile?.role === 'client';

  let projectsQuery = supabase.from('projects').select('*');
  if (isClient) {
    projectsQuery = projectsQuery.eq('client_id', user.id);
  } else {
    projectsQuery = projectsQuery.eq('freelancer_id', user.id);
  }
  const { data: projects } = await projectsQuery;
  const projectIds = (projects ?? []).map((p) => p.id);

  let entries: Array<{
    id: string;
    project_id: string;
    start: string;
    end: string | null;
    duration_seconds: number;
    memo: string | null;
    status: string;
    projects?: { name: string };
  }> = [];

  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('time_entries')
      .select('*, projects(name)')
      .in('project_id', projectIds)
      .order('start', { ascending: false })
      .limit(50);
    entries = data ?? [];
  }

  const entryIds = entries.map((e) => e.id);

  let screenshots: Array<{
    id: string;
    time_entry_id: string;
    storage_path: string;
    taken_at: string;
  }> = [];

  let activityLogs: Array<{
    time_entry_id: string;
    activity_percent: number;
  }> = [];

  if (entryIds.length > 0) {
    const [{ data: ss }, { data: al }] = await Promise.all([
      supabase.from('screenshots').select('*').in('time_entry_id', entryIds).order('taken_at', { ascending: false }).limit(24),
      supabase.from('activity_logs').select('time_entry_id, activity_percent').in('time_entry_id', entryIds),
    ]);
    screenshots = ss ?? [];
    activityLogs = al ?? [];
  }

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
  const avgActivity =
    activityLogs.length > 0
      ? Math.round(activityLogs.reduce((s, a) => s + Number(a.activity_percent), 0) / activityLogs.length)
      : 0;

  const hourlyRate = typedProfile?.hourly_rate ?? 0;
  const totalHours = totalSeconds / 3600;
  const earnings = totalHours * Number(hourlyRate);

  const screenshotUrls = await withSignedScreenshotUrls(screenshots, supabase);

  return (
    <div className="min-h-screen bg-parrot-50">
      <DashboardNav profile={typedProfile} isClient={isClient} />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-parrot-900">
            {isClient ? 'Project Overview' : 'Your Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-parrot-600">
            {isClient
              ? 'Read-only view of tracked hours and activity proof'
              : 'Hours, screenshots, and activity for all projects'}
          </p>
        </div>

        <StatsCards
          totalHours={totalHours}
          totalEntries={entries.length}
          avgActivity={avgActivity}
          earnings={earnings}
          isClient={isClient}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <WeeklyTimesheet entries={entries} hourlyRate={Number(hourlyRate)} isClient={isClient} />
          <ScreenshotsGallery screenshots={screenshotUrls} />
        </div>

        <div className="mt-8">
          <TimeEntriesTable entries={entries} isClient={isClient} />
        </div>
      </main>
    </div>
  );
}
