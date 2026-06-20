import { ComputeMetricsWidget } from "@/components/compute/ComputeMetricsWidget";
import { HeaderBar } from "@/components/shell/HeaderBar";
import { MotorMatrixWidget } from "@/components/telemetry/MotorMatrixWidget";
import { VisionFeedWidget } from "@/components/telemetry/VisionFeedWidget";

export function MasterClawDashboard() {
  return (
    <main className="min-h-screen bg-void">
      <HeaderBar />
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4 p-6">
        <ComputeMetricsWidget />
        <VisionFeedWidget />
        <MotorMatrixWidget />
      </div>
      <footer className="border-t border-line px-6 py-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
        CurXor OS · MS-S1 MAX · LOCAL MESH ONLY · NO CLOUD TELEMETRY
      </footer>
    </main>
  );
}
