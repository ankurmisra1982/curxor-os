/** Client-safe unsubscribe URL preview (no server-only). */
export function previewUnsubscribeUrl(leadId: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_CURXOR_URL?.trim() || "http://127.0.0.1:3080";
  return `${base.replace(/\/$/, "")}/api/work/unsubscribe?token=preview-${leadId}`;
}
