"use client";

interface WorkPreSendModalProps {
  open: boolean;
  missing: string[];
  onClose: () => void;
  onOpenSetupWizard?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  physicalAddress: "Physical mailing address (CAN-SPAM)",
  optOutLine: "Opt-out line in sequence copy",
};

export function WorkPreSendModal({ open, missing, onClose, onOpenSetupWizard }: WorkPreSendModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-md border border-amber-400/50 bg-panel p-4 font-mono text-[10px] shadow-lg">
        <p className="text-[11px] uppercase tracking-widest text-amber-400">Pre-send gate</p>
        <p className="mt-2 text-stark">Live SMTP is configured — complete compliance before activating sequences.</p>
        <ul className="mt-3 space-y-1 text-muted">
          {missing.map((field) => (
            <li key={field}>· Missing {FIELD_LABELS[field] ?? field}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenSetupWizard ? (
            <button
              type="button"
              onClick={() => {
                onOpenSetupWizard();
                onClose();
              }}
              className="border border-cursor-glow px-2 py-1 uppercase text-cursor-glow"
            >
              Open setup wizard
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="border border-line px-2 py-1 uppercase text-muted hover:text-stark">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
