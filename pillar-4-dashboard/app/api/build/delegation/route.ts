export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireLanAuth } from "@/lib/lan-auth";
import {
  enqueueBuildDelegation,
  resolveBuildDelegationStatus,
  type BuildDelegationStatus,
} from "@/lib/build-delegation-queue";
import { assertCanEnqueue, assertCanResolve } from "@/lib/build-delegation-policy";
import { buildDelegationReport } from "@/lib/build-delegation-report";
import { buildCafeAscensionBootstrap } from "@/lib/claw-cafe-events";
import { readUserSettings } from "@/lib/user-settings";
import type { AscensionTierId } from "@/lib/claw-cafe-ascension";
import { buildPatronBrief } from "@/lib/cafe-patron-brief";

async function policyInput() {
  const [settings, bootstrap] = await Promise.all([
    readUserSettings(),
    buildCafeAscensionBootstrap({ autoSync: false }),
  ]);
  const ascensionTier: AscensionTierId = bootstrap.ascension?.tier ?? "sprout";
  return {
    enabled: settings.buildPlane.enabled,
    allowDelegation: settings.buildPlane.allowDelegation,
    ascensionTier,
  };
}

export async function GET(): Promise<Response> {
  try {
    const report = await buildDelegationReport(24);
    return Response.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delegation report unavailable";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireLanAuth(request);
  if (denied) return denied;

  let body: {
    action?: string;
    title?: string;
    detail?: string;
    appId?: string | null;
    delegationId?: string;
    status?: BuildDelegationStatus;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = await policyInput();

  if (body.action === "suggest" || body.action === "suggest_demo") {
    const gate = assertCanEnqueue({ ...input, source: "master_ai" });
    if (!gate.ok) return Response.json({ ok: false, error: gate.reason }, { status: 403 });

    let title = body.title?.trim() ?? "";
    let detail = body.detail?.trim() ?? "";

    if (body.action === "suggest_demo" || !title) {
      const brief = await buildPatronBrief(input.ascensionTier);
      const headline = brief.lines[0] ?? "Review today's Claw activity";
      title = title || `Master AI · open build task — ${headline.slice(0, 72)}`;
      detail =
        detail ||
        [
          "Suggested from patron brief — confirm before Cursor Bridge executes.",
          ...brief.lines.slice(0, 3),
        ].join("\n");
    }

    await enqueueBuildDelegation({
      title,
      detail,
      source: "master_ai",
      appId: body.appId ?? null,
    });
    const report = await buildDelegationReport(24);
    return Response.json(report);
  }

  if (body.action === "enqueue" && body.title?.trim()) {
    const gate = assertCanEnqueue({ ...input, source: "user" });
    if (!gate.ok) return Response.json({ ok: false, error: gate.reason }, { status: 403 });

    await enqueueBuildDelegation({
      title: body.title,
      detail: body.detail,
      source: "user",
      appId: body.appId ?? null,
    });
    const report = await buildDelegationReport(24);
    return Response.json(report);
  }

  if (
    body.action === "resolve" &&
    body.delegationId &&
    (body.status === "approved" || body.status === "rejected" || body.status === "completed")
  ) {
    const gate = assertCanResolve({ ...input, status: body.status });
    if (!gate.ok) return Response.json({ ok: false, error: gate.reason }, { status: 403 });

    const result = await resolveBuildDelegationStatus(body.delegationId, body.status);
    if (!result.ok) {
      if (result.error === "not_found") {
        return Response.json({ ok: false, error: "Delegation not found" }, { status: 404 });
      }
      return Response.json({ ok: false, error: "Invalid delegation status transition" }, { status: 409 });
    }

    const report = await buildDelegationReport(24);
    return Response.json({ ...report, delegationItem: result.item });
  }

  return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
