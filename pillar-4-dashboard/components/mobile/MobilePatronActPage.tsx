"use client";

import Link from "next/link";

import { PatronApprovalCards } from "@/components/patron/PatronApprovalCards";

export function MobilePatronActPage() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="font-sans text-sm font-semibold text-stark">Act</h2>
        <p className="font-sans text-xs text-muted">Confirm queue — same bus as desktop Patron Ask.</p>
      </div>
      <PatronApprovalCards compact={false} />
      <Link href="/m/ask" className="inline-block font-sans text-xs text-cursor-glow hover:underline">
        Ask Patron about priorities →
      </Link>
    </div>
  );
}
