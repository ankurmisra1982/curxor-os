"use client";

export interface ClickSummaryRow {
  postId: string;
  clicks: number;
  lastClickedAt: string | null;
}

export interface FunnelPlatformRow {
  platform: string;
  label: string;
  posts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalClicks: number;
  avgEngagementRate: number;
}

export interface FunnelReport {
  platforms: FunnelPlatformRow[];
  totals: {
    views: number;
    likes: number;
    comments: number;
    clicks: number;
    postsTracked: number;
  };
  topPosts: Array<{
    postId: string;
    platform: string;
    views: number;
    likes: number;
    clicks: number;
    engagementRate: number;
  }>;
}

interface ContentAttributionPanelProps {
  funnel: FunnelReport | null;
  clicks: ClickSummaryRow[];
  onRefresh: () => void;
  loading?: boolean;
}

export function ContentAttributionPanel({ funnel, clicks, onRefresh, loading }: ContentAttributionPanelProps) {
  return (
    <div className="space-y-3 font-mono text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <p className="uppercase tracking-widest text-muted">UTM + click attribution</p>
        <button type="button" onClick={onRefresh} disabled={loading} className="border border-line px-2 py-0.5 uppercase text-muted hover:text-stark">
          Refresh
        </button>
      </div>
      <p className="text-muted">
        Outbound links auto-tag with UTM when trackLinks is on in brand kit. Clicks route through /api/content/click.
      </p>
      {funnel ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="Views" value={String(funnel.totals.views)} />
          <Stat label="Engagement" value={String(funnel.totals.likes + funnel.totals.comments)} />
          <Stat label="Clicks" value={String(funnel.totals.clicks)} highlight />
          <Stat label="Posts tracked" value={String(funnel.totals.postsTracked)} />
        </div>
      ) : null}
      {funnel && funnel.platforms.length > 0 ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-[9px] uppercase text-muted">
              <th className="py-1 text-left">Platform</th>
              <th className="py-1 text-right">Views</th>
              <th className="py-1 text-right">Clicks</th>
              <th className="py-1 text-right">Eng rate</th>
            </tr>
          </thead>
          <tbody>
            {funnel.platforms.map((p) => (
              <tr key={p.platform} className="border-b border-line/40">
                <td className="py-1 text-stark">{p.label}</td>
                <td className="py-1 text-right">{p.totalViews}</td>
                <td className="py-1 text-right text-cursor-glow">{p.totalClicks}</td>
                <td className="py-1 text-right">{(p.avgEngagementRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {clicks.length > 0 ? (
        <ul className="space-y-1">
          {clicks.slice(0, 6).map((c) => (
            <li key={c.postId} className="flex justify-between text-muted">
              <span>{c.postId}</span>
              <span className="text-cursor-glow">{c.clicks} clicks</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border border-line bg-panel px-2 py-2">
      <p className="text-muted">{label}</p>
      <p className={highlight ? "text-cursor-glow" : "text-stark"}>{value}</p>
    </div>
  );
}

export function ContentFunnelPanel({ funnel }: { funnel: FunnelReport | null }) {
  if (!funnel?.topPosts.length) return null;
  return (
    <div className="mt-3 border border-line/60 p-2 font-mono text-[10px]">
      <p className="mb-2 uppercase tracking-widest text-muted">Top performers</p>
      <ul className="space-y-1">
        {funnel.topPosts.map((p) => (
          <li key={p.postId} className="flex justify-between gap-2">
            <span className="text-cursor-glow">{p.postId}</span>
            <span className="text-muted">{p.platform}</span>
            <span>{p.views} views · {p.clicks} clicks</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
