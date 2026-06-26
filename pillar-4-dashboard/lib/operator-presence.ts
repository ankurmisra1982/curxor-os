/** Idle before Cafe night-watch when tab stays open (kiosk / pinned tab). */
export const OPERATOR_IDLE_MS = 2 * 60 * 1000;

export function isOperatorAway(opts: {
  documentHidden: boolean;
  lastActivityAtMs: number;
  nowMs: number;
  idleMs?: number;
}): boolean {
  if (opts.documentHidden) return true;
  const idleMs = opts.idleMs ?? OPERATOR_IDLE_MS;
  return opts.nowMs - opts.lastActivityAtMs >= idleMs;
}
