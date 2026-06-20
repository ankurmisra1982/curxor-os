"use client";

import { useEffect } from "react";

import { useUiMode } from "@/components/ui/UiModeProvider";

export function ExpertBodyClass() {
  const { isExpert } = useUiMode();

  useEffect(() => {
    document.body.classList.toggle("expert-mode", isExpert);
    return () => document.body.classList.remove("expert-mode");
  }, [isExpert]);

  return null;
}
