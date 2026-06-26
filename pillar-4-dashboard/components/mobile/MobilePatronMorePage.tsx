"use client";

import Link from "next/link";

import { ASK_PATH, HOME_PATH } from "@/lib/ui-categories";

export function MobilePatronMorePage() {
  return (
    <div className="space-y-4 p-4 font-sans text-sm">
      <p className="text-muted">
        Patron Link is a limited pocket surface — confirm, brief, and chat. Full Flight Command stays on
        desktop.
      </p>
      <Link href={HOME_PATH} className="block border border-line px-4 py-3 text-stark">
        Open Flight Command (desktop)
      </Link>
      <Link href={ASK_PATH} className="block border border-line px-4 py-3 text-stark">
        Patron Ask fullscreen (desktop)
      </Link>
      <p className="font-mono text-[10px] text-muted">
        Pair on LAN · MO0 shell · push notifications horizon MO2
      </p>
    </div>
  );
}
