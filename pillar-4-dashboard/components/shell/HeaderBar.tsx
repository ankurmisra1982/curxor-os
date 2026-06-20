import { StatusClock } from "./StatusClock";

export function HeaderBar() {
  return (
    <header className="border-b border-line bg-void px-6 py-4">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cursor-glow">CurXor OS</p>
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-stark">Flight Terminal</h1>
        </div>
        <div className="hidden items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-muted md:flex">
          <span>PILLAR 4 · CAPTIVE PORTAL</span>
          <span className="text-cursor-glow">OFFLINE SOVEREIGN MODE</span>
          <span><StatusClock /></span>
        </div>
      </div>
    </header>
  );
}
