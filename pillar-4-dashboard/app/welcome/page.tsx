export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { YourBoxWizard } from "@/components/welcome/YourBoxWizard";
import { requireWelcomeIncomplete } from "@/lib/fre-guard";

export default async function WelcomePage() {
  await requireWelcomeIncomplete();
  return <YourBoxWizard />;
}
