"use client";

interface McpConfirmPreview {
  to?: string;
  subject?: string;
  body?: string;
  dry_run?: boolean;
  confirmRequired?: string;
}

interface WorkMcpConfirmModalProps {
  open: boolean;
  sequenceId: string | null;
  preview: McpConfirmPreview | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm?: () => void;
}

export function WorkMcpConfirmModal({
  open,
  sequenceId,
  preview,
  loading,
  error,
  onClose,
  onConfirm,
}: WorkMcpConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto border border-line bg-panel p-4 font-mono text-[10px]">
        <div className="flex items-start justify-between gap-2">
          <p className="uppercase tracking-widest text-cursor-glow">MCP send preview</p>
          <button type="button" onClick={onClose} className="text-muted hover:text-stark">
            Close
          </button>
        </div>
        <p className="mt-2 text-muted">Sequence {sequenceId ?? "—"} · dry run — confirm before live send</p>
        {loading ? <p className="mt-3 text-muted">Loading preview…</p> : null}
        {error ? <p className="mt-3 text-red-400">{error}</p> : null}
        {preview ? (
          <div className="mt-3 space-y-2 border border-line/60 p-3">
            {preview.to ? <p className="text-stark">To: {preview.to}</p> : null}
            {preview.subject ? <p className="text-stark">Subject: {preview.subject}</p> : null}
            {preview.body ? <p className="text-muted whitespace-pre-wrap">{preview.body}</p> : null}
            {preview.confirmRequired ? (
              <p className="text-amber-400">{preview.confirmRequired}</p>
            ) : (
              <p className="text-muted">Live send requires MCP confirm:true — use desk approval queue for production.</p>
            )}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {onConfirm ? (
            <button
              type="button"
              disabled={loading || !preview}
              onClick={onConfirm}
              className="border border-cursor-glow px-2 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
            >
              Acknowledge
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="border border-line px-2 py-0.5 uppercase text-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
