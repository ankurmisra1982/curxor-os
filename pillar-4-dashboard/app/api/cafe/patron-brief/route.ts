export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { buildCafeAscensionBootstrap } from "@/lib/claw-cafe-events";
import { buildPatronBrief } from "@/lib/cafe-patron-brief";
import { patronBriefMode } from "@/lib/cafe-master-chamber";

export async function GET(): Promise<Response> {
  const bootstrap = await buildCafeAscensionBootstrap({ autoSync: true });
  const tier = bootstrap.ascension?.tier;
  if (!tier) {
    return Response.json({ ok: false, error: "no_ascension" }, { status: 400 });
  }

  const mode = patronBriefMode(tier);
  if (mode === "locked") {
    return Response.json({
      ok: true,
      mode,
      locked: true,
      lines: [],
      whisper: "The chamber does not answer yet.",
    });
  }

  const brief = await buildPatronBrief(tier);
  return Response.json({ ok: true, locked: false, ...brief });
}
