"use client";

interface WorkApprovalPolicyPanelProps {
  requireSendApproval: boolean;
  envForced?: boolean;
  growthDefault?: boolean;
  onToggle: (value: boolean) => void;
  busy?: boolean;
}

export function WorkApprovalPolicyPanel({
  requireSendApproval,
  envForced,
  growthDefault,
  onToggle,
  busy,
}: WorkApprovalPolicyPanelProps) {
  return (
    <div className="mb-3 space-y-2 border border-line bg-panel/40 px-3 py-2 font-mono text-[10px]">
      <p className="uppercase tracking-widest text-cursor-glow">Send approval gate</p>
      <p className="text-muted">
        Queue outbound sequence steps for human OK before SMTP bridge · Telegram inline approve when configured
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-stark">
        <input
          type="checkbox"
          checked={requireSendApproval}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={busy || envForced}
          className="accent-cursor-glow"
        />
        <span>Require approval before send</span>
      </label>
      {envForced ? (
        <p className="text-amber-400">Forced on via CURXOR_WORK_REQUIRE_APPROVAL</p>
      ) : growthDefault && requireSendApproval ? (
        <p className="text-muted">Default on at Operator level (L3+) — toggle in FRE or here</p>
      ) : null}
    </div>
  );
}
