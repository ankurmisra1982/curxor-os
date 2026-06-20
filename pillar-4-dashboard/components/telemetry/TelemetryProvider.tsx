"use client";



import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";



import type { DigitalReceipt } from "@/lib/digital-protocol";

import type { MotorCommandEvent, VisionFrameEvent } from "@/lib/telemetry-events";



interface VisionContextValue {

  frame: VisionFrameEvent | null;

  connected: boolean;

}



interface MotorContextValue {

  command: MotorCommandEvent | null;

  connected: boolean;

}



interface DigitalContextValue {

  receipts: DigitalReceipt[];

  connected: boolean;

}



const VisionContext = createContext<VisionContextValue | null>(null);

const MotorContext = createContext<MotorContextValue | null>(null);

const DigitalContext = createContext<DigitalContextValue | null>(null);



function parseJson<T>(raw: string): T | null {

  try {

    return JSON.parse(raw) as T;

  } catch {

    return null;

  }

}



export function TelemetryProvider({ children }: { children: ReactNode }) {

  const [frame, setFrame] = useState<VisionFrameEvent | null>(null);

  const [visionConnected, setVisionConnected] = useState(false);

  const [command, setCommand] = useState<MotorCommandEvent | null>(null);

  const [motorConnected, setMotorConnected] = useState(false);

  const [receipts, setReceipts] = useState<DigitalReceipt[]>([]);

  const [digitalConnected, setDigitalConnected] = useState(false);



  useEffect(() => {

    const vision = new EventSource("/api/stream/vision");

    vision.onopen = () => setVisionConnected(true);

    vision.onerror = () => setVisionConnected(false);

    vision.onmessage = (event) => {

      const parsed = parseJson<VisionFrameEvent>(event.data);

      if (parsed) setFrame(parsed);

    };



    const motor = new EventSource("/api/stream/motor");

    motor.onopen = () => setMotorConnected(true);

    motor.onerror = () => setMotorConnected(false);

    motor.onmessage = (event) => {

      const parsed = parseJson<MotorCommandEvent>(event.data);

      if (parsed) setCommand(parsed);

    };



    const digital = new EventSource("/api/stream/digital");

    digital.onopen = () => setDigitalConnected(true);

    digital.onerror = () => setDigitalConnected(false);

    digital.onmessage = (event) => {

      const parsed = parseJson<DigitalReceipt>(event.data);

      if (!parsed?.tool) return;

      setReceipts((prev) => {
        if (parsed.id && prev.some((r) => r.id === parsed.id)) return prev;
        const next = [...prev, parsed];
        return next.length > 100 ? next.slice(-100) : next;
      });

    };



    return () => {

      vision.close();

      motor.close();

      digital.close();

    };

  }, []);



  const visionValue = useMemo(

    () => ({ frame, connected: visionConnected }),

    [frame, visionConnected],

  );

  const motorValue = useMemo(

    () => ({ command, connected: motorConnected }),

    [command, motorConnected],

  );

  const digitalValue = useMemo(

    () => ({ receipts, connected: digitalConnected }),

    [receipts, digitalConnected],

  );



  return (

    <VisionContext.Provider value={visionValue}>

      <MotorContext.Provider value={motorValue}>

        <DigitalContext.Provider value={digitalValue}>{children}</DigitalContext.Provider>

      </MotorContext.Provider>

    </VisionContext.Provider>

  );

}



export function useVisionStreamContext(): VisionContextValue {

  const ctx = useContext(VisionContext);

  if (!ctx) {

    throw new Error("useVisionStream must be used within TelemetryProvider");

  }

  return ctx;

}



export function useMotorStreamContext(): MotorContextValue {

  const ctx = useContext(MotorContext);

  if (!ctx) {

    throw new Error("useMotorStream must be used within TelemetryProvider");

  }

  return ctx;

}



export function useDigitalStreamContext(): DigitalContextValue {

  const ctx = useContext(DigitalContext);

  if (!ctx) {

    throw new Error("useDigitalStream must be used within TelemetryProvider");

  }

  return ctx;

}


