"use client";

import { useEffect, useState } from "react";

export function StatusClock() {
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC");
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{now || "—"}</span>;
}
