import { createSupabaseClient, STORAGE_BUCKET, type Project, type Profile } from '@hourly/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

export { STORAGE_BUCKET };

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('freelancer_id', userId)
    .order('name');
  if (error) return [];
  return data as Project[];
}

export async function createProject(
  name: string,
  freelancerId: string,
  clientId?: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, freelancer_id: freelancerId, client_id: clientId ?? null })
    .select()
    .single();
  if (error) return null;
  return data as Project;
}

export async function uploadScreenshot(
  timeEntryId: string,
  filePath: string,
  userId: string,
): Promise<boolean> {
  try {
    const base64 = await window.hourly.readFileBase64(filePath);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const storagePath = `${userId}/${timeEntryId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return false;
    }

    const { error: dbError } = await supabase.from('screenshots').insert({
      time_entry_id: timeEntryId,
      storage_path: storagePath,
      taken_at: new Date().toISOString(),
    });

    return !dbError;
  } catch (err) {
    console.error('Screenshot upload failed:', err);
    return false;
  }
}

export async function logActivity(
  timeEntryId: string,
  keysCount: number,
  clicksCount: number,
  activityPercent: number,
): Promise<void> {
  await supabase.from('activity_logs').insert({
    time_entry_id: timeEntryId,
    interval_start: new Date().toISOString(),
    keys_count: keysCount,
    clicks_count: clicksCount,
    activity_percent: activityPercent,
  });
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
