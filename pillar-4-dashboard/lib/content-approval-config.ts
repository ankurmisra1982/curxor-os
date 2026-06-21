import "server-only";

import { readAppFreState } from "./app-fre-state";
import { envFlag } from "./digital-env";

export async function requirePublishApproval(): Promise<boolean> {
  if (envFlag("CURXOR_REQUIRE_PUBLISH_APPROVAL", false)) return true;
  const fre = await readAppFreState("my-content-creator");
  return fre.config.requirePublishApproval === true;
}

export async function requireReplyApproval(): Promise<boolean> {
  if (envFlag("CURXOR_REQUIRE_REPLY_APPROVAL", false)) return true;
  const fre = await readAppFreState("my-content-creator");
  if (fre.config.requireReplyApproval === true) return true;
  return await requirePublishApproval();
}
