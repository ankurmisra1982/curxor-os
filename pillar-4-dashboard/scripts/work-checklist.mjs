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
  const sendOk = tourSend?.status === "simulated" || tourSend?.status === "sent" || tourSend?.status === "queued" || l3Ok;
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
  const proven = status.sends?.find((s) => s.status === "simulated" || s.status === "sent" || s.status === "queued");
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

// W14 — snooze_mail
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.[0]?.id;
  if (!mailId) {
    fail("snooze_mail", "no mail");
  } else {
    const { ok, json } = await post("/api/work/status", { action: "snooze_mail", mailId, days: 1 });
    if (ok && json.task?.dueAt) {
      pass("snooze_mail", json.task.id);
    } else {
      fail("snooze_mail", `dueAt=${json.task?.dueAt}`);
    }
  }
}

// W14 — list_threads
{
  const { ok, json } = await post("/api/work/status", { action: "list_threads" });
  if (ok && Array.isArray(json.threads) && json.threads.length >= 1) {
    pass("list_threads", `${json.threads.length} threads`);
  } else {
    fail("list_threads", `threads=${json.threads?.length}`);
  }
}

// W15 — deliverability_dns
{
  const status = (await get("/api/work/status")).json;
  const d = status.deliverability;
  if (d?.spfStatus && d?.dkimStatus && (d.dmarcStatus || d.dns)) {
    pass("deliverability_dns", `spf=${d.spfStatus} dkim=${d.dkimStatus}`);
  } else {
    fail("deliverability_dns", "missing DNS fields");
  }
}

// W15 — warmup_policy
{
  const status = (await get("/api/work/status")).json;
  const sp = status.sendPolicy;
  if (sp && typeof sp.remainingToday === "number") {
    pass("warmup_policy", `remaining=${sp.remainingToday}`);
  } else {
    fail("warmup_policy", "missing sendPolicy");
  }
}

// W16 — crm_conflict_list
{
  const { ok, json } = await post("/api/work/status", { action: "crm_conflict_list" });
  if (ok && Array.isArray(json.conflicts)) {
    pass("crm_conflict_list", `${json.conflicts.length} conflicts`);
  } else {
    fail("crm_conflict_list", "missing conflicts array");
  }
}

// W16 — microsoft_status
{
  const { ok, json } = await post("/api/work/status", { action: "microsoft_status" });
  if (ok && json.microsoft?.scopes) {
    pass("microsoft_status", json.microsoft.demo ? "demo" : "live");
  } else {
    fail("microsoft_status", "missing microsoft block");
  }
}

// W17 — executive_brief
{
  const { ok, json } = await post("/api/work/status", { action: "executive_brief" });
  if (ok && json.brief?.headline && Array.isArray(json.brief.sections)) {
    pass("executive_brief", json.brief.stats?.stalls ?? "ok");
  } else {
    fail("executive_brief", "missing brief");
  }
}

// W17 — stall_detection
{
  const { ok, json } = await post("/api/work/status", { action: "stall_detection" });
  if (ok && Array.isArray(json.stalled) || Array.isArray(json.stalls)) {
    const list = json.stalled ?? json.stalls;
    pass("stall_detection", `${list.length} stalled`);
  } else {
    fail("stall_detection", "missing stalled array");
  }
}

// W18 — audit_timeline
{
  const { ok, json } = await post("/api/work/status", { action: "audit_list" });
  if (ok && Array.isArray(json.audit)) {
    pass("audit_timeline", `${json.audit.length} entries`);
  } else {
    fail("audit_timeline", "missing audit");
  }
}

// W18 — approval_notify_demo
{
  const { ok, json } = await post("/api/work/status", { action: "approval_notify_demo" });
  if (ok && typeof json.demoLogged === "boolean") {
    pass("approval_notify_demo", String(json.demoLogged));
  } else {
    fail("approval_notify_demo", `demoLogged=${json.demoLogged}`);
  }
}

// W20 — xp_event_emit
{
  const { ok, json } = await post("/api/work/status", { action: "xp_event_emit", kind: "draft_reply" });
  if (ok && (json.event?.kind === "draft_reply" || json.skipped === true)) {
    pass("xp_event_emit", json.event?.id ?? "opt-out");
  } else {
    fail("xp_event_emit", json.error ?? "no event");
  }
}

// W21 — work_claw_rename
{
  const { ok, json } = await get("/api/work/status");
  if (ok && json.productName === "Work Claw") {
    pass("work_claw_rename", json.productName);
  } else {
    fail("work_claw_rename", `productName=${json.productName}`);
  }
}

// W21 — microsoft_oauth_status
{
  const { ok, json } = await post("/api/work/status", { action: "microsoft_oauth_status" });
  if (ok && json.microsoft?.scopes) {
    pass("microsoft_oauth_status", json.microsoft.demo ? "demo" : "configured");
  } else {
    fail("microsoft_oauth_status", "missing microsoft");
  }
}

// W22 — thread_expand_smoke
{
  await post("/api/work/status", { action: "scan_inbox" });
  const { ok, json } = await post("/api/work/status", { action: "list_threads" });
  const multi = json.threads?.find((t) => t.messages?.length >= 2);
  if (ok && multi) {
    pass("thread_expand_smoke", `${multi.messages.length} msgs`);
  } else {
    fail("thread_expand_smoke", `threads=${json.threads?.length}`);
  }
}

// W22 — archive_mail
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.find((m) => !m.archivedAt)?.id;
  if (!mailId) {
    fail("archive_mail", "no mail");
  } else {
    const { ok, json } = await post("/api/work/status", { action: "archive_mail", mailId });
    if (ok && json.entry?.archivedAt) {
      pass("archive_mail", mailId);
    } else {
      fail("archive_mail", `archivedAt=${json.entry?.archivedAt}`);
    }
  }
}

// W22 — compose_send_simulated
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.find((m) => !m.archivedAt)?.id ?? status.mailIndex?.[0]?.id;
  if (!mailId) {
    fail("compose_send_simulated", "no mail");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "compose_send",
      mailId,
      subject: "Re: checklist",
      body: "Thanks for your note — checklist simulated send.",
    });
    const st = json.sendStatus ?? json.status;
    if (ok && json.ok && (st === "simulated" || st === "sent" || st === "queued")) {
      pass("compose_send_simulated", String(st));
    } else {
      fail("compose_send_simulated", `ok=${json.ok} status=${st}`);
    }
  }
}

// W23 — suppression_block
{
  const { ok, json } = await post("/api/work/status", { action: "suppression_block_test" });
  if (ok && json.ok === true) {
    pass("suppression_block", json.email);
  } else {
    fail("suppression_block", `ok=${json.ok}`);
  }
}

// W23 — warmup_dashboard
{
  const status = (await get("/api/work/status")).json;
  const sp = status.sendPolicy;
  const d = status.deliverability;
  if (sp && typeof sp.remainingToday === "number" && (d?.warmupMode !== undefined || d?.warmupDailyCap !== undefined)) {
    pass("warmup_dashboard", `remaining=${sp.remainingToday} cap=${d?.warmupDailyCap ?? "—"}`);
  } else {
    fail("warmup_dashboard", "missing warmup fields");
  }
}

// W23 — pre_send_gate
{
  const { ok, json } = await post("/api/work/status", { action: "pre_send_gate" });
  if (ok && json.gate && typeof json.gate.ok === "boolean") {
    pass("pre_send_gate", json.gate.ok ? "ready" : `missing:${json.gate.missing?.join(",")}`);
  } else {
    fail("pre_send_gate", "missing gate");
  }
}

// W24 — hubspot_sync
{
  const { ok, json } = await post("/api/work/status", { action: "sync_hubspot" });
  if (ok && typeof json.imported === "number" && typeof json.pushed === "number") {
    pass("hubspot_sync", `imported=${json.imported} pushed=${json.pushed}`);
  } else {
    fail("hubspot_sync", "missing counts");
  }
}

// W24 — won_pauses_sequences
{
  const { ok, json } = await post("/api/work/status", { action: "won_pauses_sequences" });
  if (ok && json.ok === true) {
    pass("won_pauses_sequences", json.sequenceId);
  } else {
    fail("won_pauses_sequences", `ok=${json.ok}`);
  }
}

// W24 — crm_sync_badge
{
  const { ok, json } = await post("/api/work/status", { action: "crm_sync_badge" });
  if (ok && json.badge) {
    pass("crm_sync_badge", json.badge);
  } else {
    fail("crm_sync_badge", `badge=${json.badge}`);
  }
}

// W25 — signal_feed_list
{
  const { ok, json } = await post("/api/work/status", { action: "signal_feed_list" });
  if (ok && Array.isArray(json.signals) && json.signals.length >= 3) {
    pass("signal_feed_list", `${json.signals.length} signals`);
  } else {
    fail("signal_feed_list", `signals=${json.signals?.length}`);
  }
}

// W25 — signal_convert
{
  const feed = (await post("/api/work/status", { action: "signal_feed_list" })).json;
  const signalId = feed.signals?.[0]?.id;
  if (!signalId) {
    fail("signal_convert", "no signal");
  } else {
    const { ok, json } = await post("/api/work/status", { action: "signal_to_opportunity", signalId });
    if (ok && json.lead?.id && json.sequenceId) {
      pass("signal_convert", json.sequenceId);
    } else {
      fail("signal_convert", json.error ?? "failed");
    }
  }
}

// W26 — approval_callback_demo
{
  await post("/api/work/status", { action: "run_demo_tour", growthLevel: "L3" });
  const { ok, json } = await post("/api/work/status", { action: "approval_callback_demo" });
  if (ok && typeof json.demoLogged === "boolean") {
    pass("approval_callback_demo", String(json.demoLogged));
  } else {
    fail("approval_callback_demo", `demoLogged=${json.demoLogged}`);
  }
}

// W26 — audit_export
{
  const { ok, json } = await post("/api/work/status", { action: "audit_export" });
  if (ok && Array.isArray(json.audit)) {
    pass("audit_export", `${json.audit.length} rows`);
  } else {
    fail("audit_export", "missing audit");
  }
}

// W26 — mcp_confirm_dry_run
{
  const res = await get("/api/work/mcp");
  const tool = res.json.tools?.find((t) => t.name?.includes("send") || t.name?.includes("sequence"));
  if (res.ok && tool) {
    pass("mcp_confirm_dry_run", tool.name ?? "mcp tools");
  } else {
    fail("mcp_confirm_dry_run", "no send tool");
  }
}

// W27 — needs_you_digest
{
  const { ok, json } = await post("/api/work/status", { action: "needs_you_digest" });
  if (ok && json.demoLogged === true && typeof json.text === "string") {
    pass("needs_you_digest", "logged");
  } else {
    fail("needs_you_digest", `demoLogged=${json.demoLogged}`);
  }
}

// W27 — os_morning_brief
{
  const { ok, json } = await post("/api/work/status", { action: "os_morning_brief" });
  if (ok && typeof json.brief === "string" && json.brief.includes("CurXor OS")) {
    pass("os_morning_brief", "cross-claw");
  } else {
    fail("os_morning_brief", "missing brief");
  }
}

// W28 — xp_list
{
  const { ok, json } = await post("/api/work/status", { action: "xp_list" });
  if (ok && Array.isArray(json.events)) {
    pass("xp_list", `${json.events.length} events`);
  } else {
    fail("xp_list", "missing events");
  }
}

// W28 — xp_opt_out (settings default = emit enabled)
{
  const emit = await post("/api/work/status", { action: "xp_event_emit", kind: "create_lead" });
  if (emit.ok && (emit.json.event || emit.json.skipped)) {
    pass("xp_opt_out", emit.json.skipped ? "opt-out path ok" : emit.json.event.id);
  } else {
    fail("xp_opt_out", "emit failed");
  }
}

// W30 — compose_send_live_status
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.find((m) => !m.archivedAt && !m.doneAt)?.id ?? status.mailIndex?.[0]?.id;
  if (!mailId) {
    fail("compose_send_live_status", "no mail");
  } else {
    const { ok, json } = await post("/api/work/status", {
      action: "compose_send",
      mailId,
      subject: "Re: live status",
      body: "W30 compose send status check.",
    });
    const st = json.sendStatus ?? json.status;
    if (ok && json.sendId && (st === "queued" || st === "simulated" || st === "sent" || json.undoPending)) {
      pass("compose_send_live_status", `${st}${json.undoPending ? "+undo" : ""}`);
    } else {
      fail("compose_send_live_status", `sendId=${json.sendId} status=${st}`);
    }
  }
}

// W30 — undo_send_smoke
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.find((m) => !m.archivedAt)?.id ?? status.mailIndex?.[0]?.id;
  if (!mailId) {
    fail("undo_send_smoke", "no mail");
  } else {
    const compose = await post("/api/work/status", {
      action: "compose_send",
      mailId,
      subject: "Re: undo",
      body: "Undo window smoke.",
    });
    const sendId = compose.json.sendId;
    if (!compose.ok || !sendId) {
      fail("undo_send_smoke", "compose failed");
    } else {
      const undo = await post("/api/work/status", { action: "undo_send", sendId });
      if (undo.ok && undo.json.send?.status === "skipped") {
        pass("undo_send_smoke", sendId);
      } else {
        fail("undo_send_smoke", undo.json.error ?? undo.json.send?.status ?? "failed");
      }
    }
  }
}

// W30 — snooze_return
{
  const status = (await get("/api/work/status")).json;
  const mailId = status.mailIndex?.find((m) => !m.archivedAt && !m.doneAt)?.id;
  if (!mailId) {
    fail("snooze_return", "no mail");
  } else {
    const snooze = await post("/api/work/status", { action: "snooze_mail", mailId, days: 2 });
    if (!snooze.ok) {
      fail("snooze_return", "snooze failed");
    } else {
      const cleared = await post("/api/work/status", { action: "clear_snooze", mailId, force: true });
      const entry = cleared.json.entry;
      if (cleared.ok && entry && !entry.snoozedUntil) {
        pass("snooze_return", mailId);
      } else {
        fail("snooze_return", `snoozedUntil=${entry?.snoozedUntil}`);
      }
    }
  }
}

// W29 — live_proof_scaffold
{
  const { ok, json } = await post("/api/work/status", { action: "live_proof" });
  if (ok && json.liveProof?.livePathDocumented === true) {
    pass("live_proof_scaffold", json.liveProof.scaffoldMode ? "scaffold" : "configured");
  } else {
    fail("live_proof_scaffold", "missing liveProof");
  }
}

// W29 — mail_source_live_when_linked (demo skip OK)
{
  const proof = await post("/api/work/status", { action: "live_proof" });
  const brief = await post("/api/work/status", { action: "morning_brief" });
  const linked = proof.json.liveProof?.googleLinked || proof.json.liveProof?.microsoftLinked;
  if (!proof.ok || !brief.ok) {
    fail("mail_source_live_when_linked", "api failed");
  } else if (!linked) {
    pass("mail_source_live_when_linked", "demo ok — no oauth linked");
  } else if (brief.json.mailSourceLive === true) {
    pass("mail_source_live_when_linked", brief.json.mailSource);
  } else if (brief.json.brief?.includes("(live)")) {
    pass("mail_source_live_when_linked", "brief shows live label");
  } else {
    fail("mail_source_live_when_linked", `mailSourceLive=${brief.json.mailSourceLive}`);
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResults: ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
