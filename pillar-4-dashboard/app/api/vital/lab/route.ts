export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { readAppFreState } from "@/lib/app-fre-state";
import {
  askVitalLongevityLab,
  buildClinicianExportMarkdown,
  getVitalLabStatus,
  runProtocolDiff,
  searchLabLiterature,
} from "@/lib/vital-longevity-lab";
import { fetchVitalStatus } from "@/lib/vital-health-store";

export async function GET(): Promise<Response> {
  const [status, state] = await Promise.all([Promise.resolve(getVitalLabStatus()), fetchVitalStatus()]);
  return Response.json(
    {
      ok: true,
      lab: status,
      vitals: state.vitals.length,
      reports: state.reports.length,
      protocolSteps: state.protocol.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    action?: string;
    query?: string;
    expertLens?: string;
    limit?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";
  const [state, fre] = await Promise.all([fetchVitalStatus(), readAppFreState("my-vital")]);
  const config = fre.config ?? {};

  if (action === "ask") {
    const result = await askVitalLongevityLab(body.query ?? "", config, state, body.expertLens);
    const { markVitalLabUsed } = await import("@/lib/vital-health-store");
    await markVitalLabUsed();
    return Response.json({ ok: true, ...result });
  }

  if (action === "protocol_diff") {
    const diff = runProtocolDiff(state.protocol, body.expertLens);
    return Response.json({ ok: true, diff });
  }

  if (action === "search_literature") {
    const hits = searchLabLiterature(body.query ?? "", body.expertLens, body.limit ?? 6);
    return Response.json({ ok: true, hits, query: body.query ?? "" });
  }

  if (action === "clinician_export") {
    const markdown = buildClinicianExportMarkdown(state, config);
    return Response.json({ ok: true, markdown, filename: `vital-clinician-summary-${new Date().toISOString().slice(0, 10)}.md` });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
