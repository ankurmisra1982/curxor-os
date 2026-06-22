"use client";

interface WorkSendPolicyPanelProps {
  autoSendOnActivate: boolean;
  defaultAutoSend: boolean;
  bridgeConfigured: boolean;
  sendStaggerMinutes: number;
  dailySendLimit: number;
  onToggleAutoSend: (value: boolean) => void;
  busy?: boolean;
}

export function WorkSendPolicyPanel({
  autoSendOnActivate,
  defaultAutoSend,
  bridgeConfigured,
  sendStaggerMinutes,
  dailySendLimit,
  onToggleAutoSend,
  busy,
}: WorkSendPolicyPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <p className="text-muted">
        Daily limit {dailySendLimit} · stagger {sendStaggerMinutes} min · SMTP{" "}
        {bridgeConfigured ? "live" : "demo (simulated send)"}
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-stark">
        <input
          type="checkbox"
          checked={autoSendOnActivate}
          onChange={(e) => onToggleAutoSend(e.target.checked)}
          disabled={busy}
          className="accent-cursor-glow"
        />
        <span>Auto-send step 1 on sequence activate</span>
      </label>
      <p className="text-muted">
        Default: {defaultAutoSend ? "on when SMTP live" : "off in demo"} — activate queues step 1; when off, heartbeat
        `process_due` sends on schedule.
      </p>
    </div>
  );
}
