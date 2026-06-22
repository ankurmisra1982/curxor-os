#!/usr/bin/env node
/**
 * Manual API checklist — Outreach Claw demo flows.
 * Usage: node scripts/work-checklist.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3080";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  return { ok: res.ok, json: await res.json() };
}

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS · ${name}${detail ? ` · ${detail}` : ""}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL · ${name}${detail ? ` · ${detail}` : ""}`);
}

console.log(`==> Outreach checklist · base=${BASE}\n`);

// 1. Status bootstrap
{
  const { ok, json } = await get("/api/work/status");
  if (ok && Array.isArray(json.leads) && Array.isArray(json.sequences)) {
    pass("status bootstrap", `${json.leads.length} leads · source=${json.source ?? "demo"}`);
  } else {
    fail("status bootstrap", "missing leads or sequences");
  }
}

// 2. dashboard_bootstrap
{
  const { ok, json } = await post("/api/work/status", { action: "dashboard_bootstrap" });
  if (ok && json.goLive?.steps?.length >= 4 && json.status?.leads) {
    pass("dashboard_bootstrap", `${json.goLive.steps.length} go-live steps`);
  } else {
    fail("dashboard_bootstrap", `steps=${json.goLive?.steps?.length}`);
  }
}

// 3. draft_sequence
{
  const status = (await get("/api/work/status")).json;
  const leadId = status.leads?.[0]?.id;
  if (!leadId) {
    fail("draft_sequence", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "draft_sequence",
      leadId,
      name: "Checklist sequence",
    });
    if (ok && typeof json.sequenceId === "string") {
      pass("draft_sequence", json.sequenceId);
    } else {
      fail("draft_sequence", `sequenceId=${json.sequenceId}`);
    }
  }
}

// 4. run_demo_tour → persona path (L1 draft · L2/L3+ send or approval)
{
  const { ok, json } = await post("/api/work/status", { action: "run_demo_tour" });
  const tourSend =
    json.sendId && json.status?.sends
      ? json.status.sends.find((s) => s.id === json.sendId)
      : null;
  const l1Ok = json.tourKind === "L1-explorer" && json.mailId && json.steps?.some((s) => s.id === "draft_reply" && s.done);
  const l3Ok = tourSend?.status === "pending_approval";
  const sendOk = tourSend?.status === "simulated" || tourSend?.status === "sent" || l3Ok;
  const gtmOk = json.sequenceId && sendOk;
  if (ok && json.ok && Array.isArray(json.steps) && json.steps.length >= 3 && (l1Ok || gtmOk)) {
    pass("run_demo_tour", json.tourKind ?? `${json.sendId} · ${tourSend?.status ?? "L1"}`);
  } else {
    fail("run_demo_tour", `ok=${ok} tourOk=${json.ok} kind=${json.tourKind} send=${tourSend?.status} steps=${json.steps?.length}`);
  }
}

// 5. go_live demoReady
{
  const { ok, json } = await post("/api/work/status", { action: "go_live" });
  if (ok && typeof json.goLive?.demoReady === "boolean" && json.goLive.demoReady === true) {
    pass("go_live demoReady", `${json.goLive.progress.complete}/${json.goLive.progress.total}`);
  } else {
    fail("go_live demoReady", `demoReady=${json.goLive?.demoReady}`);
  }
}

// 6. Outbound send path (simulated when SMTP unconfigured)
{
  const status = (await get("/api/work/status")).json;
  const proven = status.sends?.find((s) => s.status === "simulated" || s.status === "sent");
  if (proven) {
    pass("send path smoke", `${proven.id} · ${proven.status}`);
  } else {
    const seq = status.sequences?.find((s) => s.status === "active") ?? status.sequences?.[0];
    if (!seq?.id) {
      fail("send path smoke", "no sequence");
    } else {
      const { ok, json } = await post("/api/work/status", { action: "send_step", sequenceId: seq.id });
      const st = json.send?.status;
      if (ok && json.ok && (st === "simulated" || st === "sent" || st === "pending_approval" || st === "queued")) {
        pass("send path smoke", st ?? "ok");
      } else {
        fail("send path smoke", `status=${st} ok=${json.ok} err=${json.error ?? ""}`);
      }
    }
  }
}

// 7. Work wizard path: create lead → draft → activate (deferred send OK)
{
  const email = `checklist-${Date.now()}@example.com`;
  const create = await post("/api/work/status", {
    action: "create_lead",
    name: "Checklist Prospect",
    email,
  });
  const leadId = create.json.lead?.id ?? create.json.status?.leads?.find((l) => l.email === email)?.id;
  if (!create.ok || !leadId) {
    fail("work wizard create_lead", `leadId=${leadId}`);
  } else {
    const draft = await post("/api/work/status", {
      action: "draft_sequence",
      leadId,
      name: "Wizard sequence",
    });
    const statusAfterDraft = (await get("/api/work/status")).json;
    const seq = statusAfterDraft.sequences?.find((s) => s.leadId === leadId && s.status === "draft");
    if (!draft.ok || !seq?.id) {
      fail("work wizard draft_sequence", `seq=${seq?.id}`);
    } else {
      const activate = await post("/api/work/status", {
        action: "activate_sequence",
        sequenceId: seq.id,
      });
      const policy = activate.json.autoSendPolicy;
      if (activate.ok && seq.id && (policy === "immediate" || policy === "deferred")) {
        pass("work wizard activate", `${seq.id} · ${policy}`);
      } else {
        fail("work wizard activate", `policy=${policy}`);
      }
    }
  }
}

// 8. Connector vault on bootstrap
{
  const { ok, json } = await post("/api/work/status", { action: "dashboard_bootstrap" });
  const vault = json.status?.connectorVault;
  if (ok && vault?.connectors?.length >= 8) {
    pass("connector_vault bootstrap", `${vault.connectors.length} connectors`);
  } else {
    fail("connector_vault bootstrap", `connectors=${vault?.connectors?.length}`);
  }
}

// 9. morning_brief
{
  const { ok, json } = await post("/api/work/status", { action: "morning_brief" });
  if (ok && typeof json.brief === "string" && json.brief.includes("Morning brief")) {
    pass("morning_brief", `${json.brief.split("\n")[0]}`);
  } else {
    fail("morning_brief", `brief=${typeof json.brief}`);
  }
}

// 10. crm_status demo
{
  const { ok, json } = await post("/api/work/status", { action: "crm_status" });
  if (ok && json.crm?.demo === true && json.crm?.backend) {
    pass("crm_status demo", `backend=${json.crm.backend}`);
  } else {
    fail("crm_status demo", `demo=${json.crm?.demo}`);
  }
}

// 11. sync_crm demo log
{
  const { ok, json } = await post("/api/work/status", { action: "sync_crm" });
  if (ok && json.push && json.pull) {
    pass("sync_crm", `push=${json.push.pushed} pull=${json.pull.imported}`);
  } else {
    fail("sync_crm", "missing push/pull");
  }
}

// 12. work mcp
{
  const res = await get("/api/work/mcp");
  if (res.ok && Array.isArray(res.json.tools) && res.json.tools.length >= 5) {
    pass("work mcp tools", `${res.json.tools.length} tools`);
  } else {
    fail("work mcp tools", `tools=${res.json?.tools?.length}`);
  }
}

// 13. enrich_lead demo
{
  const status = (await get("/api/work/status")).json;
  const leadId = status.leads?.[0]?.id;
  if (!leadId) {
    fail("enrich_lead", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", { action: "enrich_lead", leadId });
    if (ok && json.ok && json.demo === true) {
      pass("enrich_lead demo", json.source);
    } else {
      fail("enrich_lead demo", `demo=${json.demo}`);
    }
  }
}

// 14. draft_reply
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.[0]?.id;
  if (!mailId) {
    fail("draft_reply", "no mail");
  } else {
    const { ok, json } = await post("/api/work/status", { action: "draft_reply", mailId });
    if (ok && typeof json.body === "string") {
      pass("draft_reply", json.subject?.slice(0, 40) ?? "ok");
    } else {
      fail("draft_reply", "missing body");
    }
  }
}

// 15. webhook_test noop
{
  const { ok, json } = await post("/api/work/status", { action: "webhook_test" });
  if (ok && json.demo === true) {
    pass("webhook_test noop", json.detail ?? "demo");
  } else {
    fail("webhook_test noop", `demo=${json.demo}`);
  }
}

// 16. growth profile on bootstrap
{
  const { ok, json } = await post("/api/work/status", { action: "dashboard_bootstrap" });
  const gp = json.status?.growthProfile;
  if (ok && gp?.growthLevel && gp?.growthLabel) {
    pass("growth_profile bootstrap", `${gp.growthLevel} · ${gp.growthLabel}`);
  } else {
    fail("growth_profile bootstrap", `level=${gp?.growthLevel}`);
  }
}

// 17. get_growth_profile
{
  const { ok, json } = await post("/api/work/status", { action: "get_growth_profile" });
  if (ok && json.growthProfile?.growthLevel) {
    pass("get_growth_profile", json.growthProfile.growthLevel);
  } else {
    fail("get_growth_profile", `ok=${ok}`);
  }
}

// 18. apply_template_pack
{
  const { ok, json } = await post("/api/work/status", {
    action: "apply_template_pack",
    packId: "student_opportunities",
  });
  if (ok && typeof json.packId === "string") {
    pass("apply_template_pack", `tasksCreated=${json.tasksCreated ?? 0}`);
  } else {
    fail("apply_template_pack", json.error ?? "failed");
  }
}

// 19. L2 mini sequence
{
  const status = (await get("/api/work/status")).json;
  const leadId = status.leads?.[0]?.id;
  if (!leadId) {
    fail("create_mini_sequence", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "create_mini_sequence",
      leadId,
      presetId: "polite_followup",
    });
    if (ok && typeof json.sequenceId === "string") {
      pass("create_mini_sequence", json.sequenceId);
    } else {
      fail("create_mini_sequence", json.error ?? "no sequenceId");
    }
  }
}

// 20. L1 opportunity path: create lead → draft_reply
{
  const email = `l1-${Date.now()}@example.com`;
  const create = await post("/api/work/status", {
    action: "create_lead",
    name: "L1 Opportunity",
    email,
  });
  const leadId = create.json.lead?.id;
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.[0]?.id;
  if (!create.ok || !leadId) {
    fail("L1 opportunity path", "create_lead");
  } else if (!mailId) {
    pass("L1 opportunity path", `lead=${leadId} · no mail to draft`);
  } else {
    const draft = await post("/api/work/status", { action: "draft_reply", mailId, leadId });
    if (draft.ok && typeof draft.json.body === "string") {
      pass("L1 opportunity path", `lead + draft_reply`);
    } else {
      fail("L1 opportunity path", "draft_reply");
    }
  }
}

// 21. L2 mini sequence path
{
  const status = (await get("/api/work/status")).json;
  const leadId = status.leads?.[0]?.id;
  if (!leadId) {
    fail("L2 mini sequence", "no lead");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "create_mini_sequence",
      leadId,
      presetId: "polite_followup",
    });
    if (ok && json.sequenceId) {
      pass("L2 mini sequence", json.sequenceId);
    } else {
      fail("L2 mini sequence", `sequenceId=${json.sequenceId}`);
    }
  }
}

// 22. deliverability summary on status
{
  const status = (await get("/api/work/status")).json;
  const d = status.deliverability;
  if (d && typeof d.reputationScore === "number" && d.domainHealth) {
    pass("deliverability summary", `${d.reputationScore} · ${d.domainHealth}`);
  } else {
    fail("deliverability summary", "missing deliverability block");
  }
}

// 23. go_live domain_health step
{
  const { ok, json } = await post("/api/work/status", { action: "go_live" });
  const step = json.goLive?.steps?.find((s) => s.id === "domain_health");
  if (ok && step?.label) {
    pass("go_live domain_health", step.status);
  } else {
    fail("go_live domain_health", "step missing");
  }
}

// 24. L3 approval tour → pending send
{
  const { ok, json } = await post("/api/work/status", { action: "run_demo_tour", growthLevel: "L3" });
  const pending =
    json.sendId && json.status?.sends
      ? json.status.sends.find((s) => s.id === json.sendId)
      : null;
  if (ok && json.ok && json.tourKind === "L3-operator" && pending?.status === "pending_approval") {
    pass("L3 approval tour", pending.id);
  } else {
    fail("L3 approval tour", `kind=${json.tourKind} status=${pending?.status}`);
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
