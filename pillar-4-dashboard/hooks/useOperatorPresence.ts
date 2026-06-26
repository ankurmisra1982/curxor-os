"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isOperatorAway, OPERATOR_IDLE_MS } from "@/lib/operator-presence";

export function useOperatorPresence(idleMs = OPERATOR_IDLE_MS) {
  const [operatorAway, setOperatorAway] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const hiddenRef = useRef(false);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!hiddenRef.current) setOperatorAway(false);
  }, []);

  useEffect(() => {
    const tick = () => {
      setOperatorAway(
        isOperatorAway({
          documentHidden: hiddenRef.current,
          lastActivityAtMs: lastActivityRef.current,
          nowMs: Date.now(),
          idleMs,
        }),
      );
    };

    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (!document.hidden) lastActivityRef.current = Date.now();
      tick();
    };

    const onActivity = () => bumpActivity();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("mousedown", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });
    window.addEventListener("focus", onActivity);

    hiddenRef.current = document.hidden;
    const interval = window.setInterval(tick, 1000);
    tick();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("focus", onActivity);
      window.clearInterval(interval);
    };
  }, [bumpActivity, idleMs]);

  return { operatorAway, bumpActivity };
}
