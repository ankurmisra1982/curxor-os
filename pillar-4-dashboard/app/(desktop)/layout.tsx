export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";

import { FlightCommandDesktop } from "@/components/desktop/FlightCommandDesktop";
import { requireFreInitialized } from "@/lib/fre-guard";

export default async function DesktopLayout({ children }: { children: ReactNode }) {
  await requireFreInitialized();
  return <FlightCommandDesktop>{children}</FlightCommandDesktop>;
}
