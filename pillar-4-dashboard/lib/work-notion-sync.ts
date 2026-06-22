import "server-only";

import { loadDigitalEnv } from "./digital-env";
import { readWorkNotionOAuth } from "./work-notion-client";
import { importLeadsFromCsv, upsertLead } from "./work-store";

export async function pullNotionLeads(): Promise<{ imported: number; skipped: number; demo: boolean }> {
  const env = await loadDigitalEnv();
  const dbId = env.NOTION_DATABASE_ID?.trim() || env.NOTION_LEADS_DATABASE_ID?.trim();
  const oauth = await readWorkNotionOAuth();

  if (!dbId || !oauth.linked || !oauth.accessToken) {
    const csv = [
      "name,email,company,title",
      "Notion Demo Lead,notion-demo@example.com,Notion Sync Co,VP Growth",
    ].join("\n");
    const result = await importLeadsFromCsv(csv);
    return { imported: result.imported, skipped: result.skipped, demo: true };
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauth.accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 25 }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { imported: 0, skipped: 0, demo: false };
    }
    const data = (await res.json()) as {
      results?: Array<{ properties?: Record<string, { title?: Array<{ plain_text?: string }>; email?: string; rich_text?: Array<{ plain_text?: string }> }> }>;
    };
    let imported = 0;
    let skipped = 0;
    for (const page of data.results ?? []) {
      const props = page.properties ?? {};
      const name =
        props.Name?.title?.[0]?.plain_text ??
        props.name?.title?.[0]?.plain_text ??
        "Notion lead";
      const email = props.Email?.email ?? props.email?.email ?? "";
      if (!email?.includes("@")) {
        skipped += 1;
        continue;
      }
      const company = props.Company?.rich_text?.[0]?.plain_text ?? "";
      await upsertLead({ name, email, company, source: "notion" });
      imported += 1;
    }
    return { imported, skipped, demo: false };
  } catch {
    return { imported: 0, skipped: 0, demo: false };
  }
}
