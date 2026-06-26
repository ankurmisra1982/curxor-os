export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

import { PatronLinkShell } from "@/components/mobile/PatronLinkShell";
import { requireFreInitialized } from "@/lib/fre-guard";

export default async function MobileLayout({ children }: { children: ReactNode }) {
  await requireFreInitialized();
  return <PatronLinkShell>{children}</PatronLinkShell>;
}
