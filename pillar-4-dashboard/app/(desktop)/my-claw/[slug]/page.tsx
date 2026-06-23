import { notFound } from "next/navigation";

import { ForgedClawAppShell } from "@/components/apps/forge/ForgedClawAppShell";
import { getForgedAppBySlug } from "@/lib/forged-apps-store";

export default async function ForgedClawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const forgedApp = await getForgedAppBySlug(slug);
  if (!forgedApp) notFound();
  return <ForgedClawAppShell forgedApp={forgedApp} />;
}
