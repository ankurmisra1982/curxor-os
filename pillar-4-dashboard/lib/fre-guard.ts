import { redirect } from "next/navigation";

import { isFreInitialized } from "@/lib/fre-state";

export async function requireFreInitialized(): Promise<void> {
  if (!(await isFreInitialized())) {
    redirect("/setup");
  }
}

export async function requireFreSetup(): Promise<void> {
  if (await isFreInitialized()) {
    redirect("/my-work");
  }
}
