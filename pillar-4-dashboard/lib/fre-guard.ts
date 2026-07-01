import { redirect } from "next/navigation";

import { HOME_PATH } from "@/lib/ui-categories";
import { defaultAppHref, normalizeSelectedApps } from "@/lib/fre-routing";
import { isFreInitialized, readFreState } from "@/lib/fre-state";
import { readWelcomeCompleted } from "@/lib/onboarding";

export async function requireFreInitialized(): Promise<void> {
  if (!(await isFreInitialized())) {
    redirect("/setup");
  }
}

export async function requireWelcomeCompleted(): Promise<void> {
  await requireFreInitialized();
  if (!(await readWelcomeCompleted())) {
    redirect("/welcome");
  }
}

export async function requireFreSetup(): Promise<void> {
  if (await isFreInitialized()) {
    if (!(await readWelcomeCompleted())) {
      redirect("/welcome");
    }
    const fre = await readFreState();
    redirect(defaultAppHref(normalizeSelectedApps(fre.selectedApps)));
  }
}

export async function requireWelcomeIncomplete(): Promise<void> {
  await requireFreInitialized();
  if (await readWelcomeCompleted()) {
    redirect(HOME_PATH);
  }
}
