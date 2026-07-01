/** Flight Command shell v2 — hybrid layout (UX-1). Enable with NEXT_PUBLIC_CURXOR_SHELL_V2=1 */
export function isShellV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_CURXOR_SHELL_V2 === "1";
}
