export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { SetupWizard } from "@/components/setup/SetupWizard";
import { requireFreSetup } from "@/lib/fre-guard";

export default async function SetupPage() {
  await requireFreSetup();
  return <SetupWizard />;
}
