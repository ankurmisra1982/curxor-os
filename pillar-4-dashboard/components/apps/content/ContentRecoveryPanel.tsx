"use client";

export interface RecoveryCandidateRow {
  postId: string;
  platform: string;
  stage: string;
  error: string;
  fixHints: string[];
  canRetry: boolean;
}

interface ContentRecoveryPanelProps {
  candidates: RecoveryCandidateRow[];
  onRefresh: () => void;
  onRetry: (postId: string) => void;
  onClear: (postId: string) => void;
}

export function ContentRecoveryPanel({ candidates, onRefresh, onRetry, onClear }: ContentRecoveryPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex gap-2">
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      {candidates.length === 0 ? (
        <p className="text-muted">No failed publishes — bridge health looks clear.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li key={c.postId} className="border border-line/60 p-2">
              <div className="flex justify-between gap-2">
                <span className="text-cursor-glow">{c.postId}</span>
                <span className="text-muted">{c.platform} · {c.stage}</span>
              </div>
              <p className="mt-1 text-red-400">{c.error}</p>
              {c.fixHints[0] ? <p className="mt-1 text-muted">Fix: {c.fixHints[0]}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!c.canRetry}
                  onClick={() => onRetry(c.postId)}
                  className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-50"
                >
                  Retry publish
                </button>
                <button type="button" onClick={() => onClear(c.postId)} className="border border-line px-2 py-0.5 uppercase text-muted">
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
