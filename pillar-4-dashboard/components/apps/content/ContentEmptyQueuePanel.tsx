"use client";

interface ContentEmptyQueuePanelProps {
  onOpenWizard: () => void;
  onCreatePost: () => void;
  creating: boolean;
}

export function ContentEmptyQueuePanel({ onOpenWizard, onCreatePost, creating }: ContentEmptyQueuePanelProps) {
  return (
    <div className="border border-dashed border-line/80 bg-panel/40 px-4 py-8 text-center font-mono text-[10px]">
      <p className="uppercase tracking-widest text-muted">No posts in queue</p>
      <p className="mt-2 text-stark">Start with the Creation wizard — channel, draft, media, pre-flight, schedule.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onOpenWizard}
          className="border border-cursor-glow px-3 py-1 uppercase tracking-widest text-cursor-glow"
        >
          Start Creation wizard
        </button>
        <button
          type="button"
          disabled={creating}
          onClick={onCreatePost}
          className="border border-line px-3 py-1 uppercase tracking-widest text-muted hover:text-stark disabled:opacity-50"
        >
          {creating ? "Creating…" : "+ Quick post"}
        </button>
      </div>
    </div>
  );
}
