export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { requireFreInitialized } from "@/lib/fre-guard";

export default async function RootPage() {
  await requireFreInitialized();
  redirect("/my-work");
}
