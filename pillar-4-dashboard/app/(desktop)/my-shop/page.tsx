"use client";

import { ClawAgentApp } from "@/components/claw/ClawAgentApp";
import { MyShopApp } from "@/components/apps/MyShopApp";

export default function MyShopPage() {
  return (
    <ClawAgentApp appId="my-shop">
      {(ctx) => <MyShopApp {...ctx} />}
    </ClawAgentApp>
  );
}
