export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireFreInitialized } from "@/lib/fre-guard";
import { defaultAppHref, normalizeSelectedApps } from "@/lib/fre-routing";
import { readFreState } from "@/lib/fre-state";

export default async function RootPage() {
  await requireFreInitialized();
  const fre = await readFreState();
  redirect(defaultAppHref(normalizeSelectedApps(fre.selectedApps)));
}
