/**
 * Shared Playwright helpers for Signal Claw / Humanoid Home Hub demo capture.
 */

const TAB_TITLES = {
  Home: "Setup & relationship",
  Fleet: "Robots & pair wizard",
  Knowledge: "Rules & mesh",
  Routines: "Daily instructions",
  Control: "Mesh preview",
};

export async function prepareOptimusPage(page) {
  await page.addInitScript(() => {
    localStorage.setItem("curxor-experience-level", "beginner");
    localStorage.setItem("curxor-ui-mode", "simple");
  });
}

export async function waitForDashboardReady(page, base) {
  const root = base.replace(/\/$/, "");
  for (let i = 0; i < 40; i++) {
    const res = await page.request.get(`${root}/api/setup/status`);
    if (res.ok()) {
      const data = await res.json();
      if (data.initialized === true) return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error("Dashboard FRE not initialized — check CURXOR_FRE_STATE_PATH on dev server");
}

export async function gotoOptimus(page, base) {
  const root = base.replace(/\/$/, "");
  await waitForDashboardReady(page, base);
  await page.goto(`${root}/optimus`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByText(/Humanoid Home Hub/i).first().waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTitle(TAB_TITLES.Home).waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(1200);
}

export async function dismissOverlays(page) {
  const cancel = page.getByRole("button", { name: /^Cancel$/i });
  if (await cancel.count()) {
    await cancel.first().click({ force: true });
    await page.waitForTimeout(600);
  }
}

export async function clickTab(page, label) {
  await dismissOverlays(page);
  const title = TAB_TITLES[label];
  if (!title) throw new Error(`Unknown tab: ${label}`);
  await page.getByTitle(title).click();
  await page.waitForTimeout(1000);
}

export async function captureKnowledgeAudit(page, outPath) {
  await page.getByText(/Pair-day memory audit/i).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const auditBtn = page.getByRole("button", { name: /View audit/i });
  await auditBtn.first().waitFor({ state: "visible", timeout: 12_000 });
  await auditBtn.first().click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: outPath, fullPage: true });
}
