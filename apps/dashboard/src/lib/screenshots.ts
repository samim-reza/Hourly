import type { SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKET } from '@hourly/shared';
import { createAdminClient } from '@/lib/supabase/admin';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface ScreenshotRow {
  id: string;
  time_entry_id: string;
  storage_path: string;
  taken_at: string;
}

export async function withSignedScreenshotUrls<T extends ScreenshotRow>(
  screenshots: T[],
  userClient: SupabaseClient,
): Promise<Array<T & { url: string | null }>> {
  const admin = createAdminClient();

  return Promise.all(
    screenshots.map(async (s) => {
      const client = admin ?? userClient;
      const { data, error } = await client.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(s.storage_path, SIGNED_URL_TTL_SECONDS);

      if (error) {
        console.error('Screenshot signed URL failed:', s.storage_path, error.message);
      }

      return { ...s, url: data?.signedUrl ?? null };
    }),
  );
}
