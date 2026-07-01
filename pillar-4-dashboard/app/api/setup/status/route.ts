export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readFreState } from "@/lib/fre-state";
import { readWelcomeCompleted } from "@/lib/onboarding";

export async function GET(): Promise<Response> {
  const state = await readFreState();
  const welcomeCompleted = await readWelcomeCompleted();
  return Response.json(
    { ...state, welcomeCompleted },
    { headers: { "Cache-Control": "no-store" } },
  );
}
