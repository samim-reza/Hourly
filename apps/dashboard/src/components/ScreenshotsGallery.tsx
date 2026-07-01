'use client';

interface Screenshot {
  id: string;
  time_entry_id: string;
  storage_path: string;
  taken_at: string;
  url: string | null;
}

interface ScreenshotsGalleryProps {
  screenshots: Screenshot[];
}

export function ScreenshotsGallery({ screenshots }: ScreenshotsGalleryProps) {
  return (
    <div className="rounded-xl border border-parrot-200 bg-white shadow-sm">
      <div className="border-b border-parrot-100 px-5 py-4">
        <h2 className="font-semibold text-parrot-900">Screenshots</h2>
        <p className="mt-0.5 text-xs text-parrot-500">Captured every 4–9 min (random) while tracking</p>
      </div>

      {screenshots.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-parrot-500">No screenshots yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
          {screenshots.map((s) => (
            <div key={s.id} className="group relative overflow-hidden rounded-lg border border-parrot-200">
              {s.url ? (
                <img
                  src={s.url}
                  alt={`Screenshot at ${s.taken_at}`}
                  className="aspect-video w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-parrot-100 text-xs text-parrot-500">
                  Unavailable
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-parrot-900/70 to-transparent p-2">
                <p className="text-[10px] text-white">
                  {new Date(s.taken_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
