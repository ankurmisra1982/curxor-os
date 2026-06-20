import { redirect } from "next/navigation";

import { defaultAppHref, normalizeSelectedApps } from "@/lib/fre-routing";
import { isFreInitialized, readFreState } from "@/lib/fre-state";

export async function requireFreInitialized(): Promise<void> {
  if (!(await isFreInitialized())) {
    redirect("/setup");
  }
}

export async function requireFreSetup(): Promise<void> {
  if (await isFreInitialized()) {
    const fre = await readFreState();
    redirect(defaultAppHref(normalizeSelectedApps(fre.selectedApps)));
  }
}
