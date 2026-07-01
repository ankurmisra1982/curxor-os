"use client";

import { useEffect } from "react";

import { useUiMode } from "@/components/ui/UiModeProvider";

export function ExpertBodyClass() {
  const { isLayoutExpert } = useUiMode();

  useEffect(() => {
    document.body.classList.toggle("expert-mode", isLayoutExpert);
    return () => document.body.classList.remove("expert-mode");
  }, [isLayoutExpert]);

  return null;
}
