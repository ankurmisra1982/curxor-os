export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import { isSocialPlatform, type SocialPlatformId } from "@/lib/social-channels";
import {
  dispatchContentSignal,
  dispatchOutreachSignal,
  ingestUnifiedSignal,
  listUnifiedSignals,
  parseUnifiedSignalRef,
} from "@/lib/signal-feed-unified";
import type { WorkSignalIntent } from "@/lib/work-queue-types";

export async function GET(request: Request) {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  const signals = await listUnifiedSignals(12);
  return Response.json({ ok: true, signals, updatedAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const denied = requireLanAuth(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "list";

  try {
    switch (action) {
      case "list": {
        const signals = await listUnifiedSignals(12);
        return Response.json({ ok: true, signals, updatedAt: new Date().toISOString() });
      }

      case "ingest": {
        const domain = body.domain === "content" ? "content" : "outreach";
        const title = typeof body.title === "string" ? body.title.trim() : "";
        if (!title) return Response.json({ ok: false, error: "title required" }, { status: 400 });

        const signal = await ingestUnifiedSignal({
          domain,
          title,
          summary: typeof body.summary === "string" ? body.summary : undefined,
          source: typeof body.source === "string" ? body.source : undefined,
          intent: typeof body.intent === "string" ? (body.intent as WorkSignalIntent) : undefined,
          score: typeof body.score === "number" ? body.score : undefined,
          urgency:
            body.urgency === "low" || body.urgency === "medium" || body.urgency === "high"
              ? body.urgency
              : undefined,
        });
        const signals = await listUnifiedSignals(12);
        return Response.json({ ok: true, signal, signals });
      }

      case "dispatch_outreach": {
        const ref =
          typeof body.signalRef === "string"
            ? parseUnifiedSignalRef(body.signalRef)
            : typeof body.signalId === "string"
              ? { domain: "outreach" as const, sourceId: body.signalId }
              : null;
        if (!ref || ref.domain !== "outreach") {
          return Response.json({ ok: false, error: "outreach signal required" }, { status: 400 });
        }
        const result = await dispatchOutreachSignal(ref.sourceId);
        const signals = await listUnifiedSignals(12);
        return Response.json({ ok: true, ...result, signals });
      }

      case "dispatch_content": {
        const ref =
          typeof body.signalRef === "string"
            ? parseUnifiedSignalRef(body.signalRef)
            : typeof body.signalId === "string"
              ? { domain: "content" as const, sourceId: body.signalId }
              : null;
        if (!ref || ref.domain !== "content") {
          return Response.json({ ok: false, error: "content signal required" }, { status: 400 });
        }
        const platform =
          typeof body.platform === "string" && isSocialPlatform(body.platform)
            ? (body.platform as SocialPlatformId)
            : "x";
        const draft = await dispatchContentSignal(ref.sourceId, platform);
        const signals = await listUnifiedSignals(12);
        return Response.json({ ok: true, draft, signals });
      }

      default:
        return Response.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "signal action failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
