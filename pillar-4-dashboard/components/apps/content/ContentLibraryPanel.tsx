"use client";

export interface LibraryAssetRow {
  id: string;
  name: string;
  type: string;
  postId: string | null;
  platform: string | null;
  draftPreview: string;
  tags: string[];
  evergreen: boolean;
  evergreenIntervalDays: number;
  lastRecycledAt: string | null;
}

interface ContentLibraryPanelProps {
  assets: LibraryAssetRow[];
  selectedPostId: string | null;
  onRefresh: () => void;
  onSaveFromPost: (postId: string, evergreen: boolean, intervalDays: number) => void;
  onCreatePost: (assetId: string) => void;
  onRecycleNow: () => void;
  busy?: boolean;
}

export function ContentLibraryPanel({
  assets,
  selectedPostId,
  onRefresh,
  onSaveFromPost,
  onCreatePost,
  onRecycleNow,
  busy,
}: ContentLibraryPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!selectedPostId || busy}
          onClick={() => selectedPostId && onSaveFromPost(selectedPostId, false, 30)}
          className="border border-line px-2 py-0.5 uppercase text-stark hover:border-cursor-glow disabled:opacity-50"
        >
          Save selected to library
        </button>
        <button
          type="button"
          disabled={!selectedPostId || busy}
          onClick={() => selectedPostId && onSaveFromPost(selectedPostId, true, 30)}
          className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
        >
          Save as evergreen
        </button>
        <button type="button" onClick={onRecycleNow} disabled={busy} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Run recycle tick
        </button>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      {assets.length === 0 ? (
        <p className="text-muted">No library assets yet — publish or save from queue.</p>
      ) : (
        <ul className="space-y-2">
          {assets.slice(0, 12).map((a) => (
            <li key={a.id} className="border border-line/60 p-2">
              <div className="flex justify-between gap-2">
                <span className="text-cursor-glow">{a.name}</span>
                <span className="text-muted">{a.type}</span>
              </div>
              <p className="mt-1 text-stark">{a.draftPreview}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.evergreen ? (
                  <span className="text-amber-400">Evergreen · every {a.evergreenIntervalDays}d</span>
                ) : null}
                <button type="button" onClick={() => onCreatePost(a.id)} className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow">
                  New post from asset
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
