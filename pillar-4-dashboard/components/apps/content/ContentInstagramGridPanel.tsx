"use client";

export interface InstagramGridCellRow {
  postId: string;
  stage: string;
  imageUrl: string | null;
  draftPreview: string;
  position: number;
}

export interface InstagramGridPlanRow {
  cells: InstagramGridCellRow[];
  scheduledCount: number;
  publishedCount: number;
  gapWarnings: string[];
}

interface ContentInstagramGridPanelProps {
  grid: InstagramGridPlanRow | null;
  onRefresh: () => void;
}

export function ContentInstagramGridPanel({ grid, onRefresh }: ContentInstagramGridPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex items-center justify-between">
        <p className="text-muted">
          {grid ? `${grid.scheduledCount} scheduled · ${grid.publishedCount} published` : "Loading…"}
        </p>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      {grid?.gapWarnings.map((w) => (
        <p key={w} className="text-amber-400">{w}</p>
      ))}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-3">
        {(grid?.cells ?? []).map((cell) => (
          <div
            key={cell.postId}
            className="aspect-square border border-line bg-void p-1 flex flex-col justify-end overflow-hidden"
          >
            {cell.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cell.imageUrl} alt="" className="mb-1 h-full w-full object-cover" />
            ) : (
              <div className="mb-1 flex-1 bg-panel/50" />
            )}
            <span className="truncate text-[8px] text-muted">{cell.postId} · {cell.stage}</span>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 9 - (grid?.cells.length ?? 0)) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square border border-dashed border-line/40 bg-void" />
        ))}
      </div>
    </div>
  );
}
