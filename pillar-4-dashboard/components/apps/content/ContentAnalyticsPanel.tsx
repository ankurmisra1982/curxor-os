"use client";

export interface PostMetricsRow {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  ctr: number | null;
  source?: string;
}

export interface HookPerfRow {
  hookVariantId: string;
  label: string;
  avgViews: number;
  avgLikes: number;
  samples: number;
}

export interface ContentRecommendationRow {
  id: string;
  kind: string;
  title: string;
  detail: string;
  action: string;
  payload: Record<string, unknown>;
  score: number;
}

interface ContentAnalyticsPanelProps {
  metrics: PostMetricsRow[];
  hookPerformance: HookPerfRow[];
  thumbPerformance?: HookPerfRow[];
  recommendations?: ContentRecommendationRow[];
  onRefreshDemo: () => void;
  onPullLive: () => void;
  onApplyRecommendation?: (rec: ContentRecommendationRow) => void;
  onRefreshRecommendations?: () => void;
  loading?: boolean;
  liveConfigured?: boolean;
}

export function ContentAnalyticsPanel({
  metrics,
  hookPerformance,
  thumbPerformance = [],
  recommendations = [],
  onRefreshDemo,
  onPullLive,
  onApplyRecommendation,
  onRefreshRecommendations,
  loading,
  liveConfigured,
}: ContentAnalyticsPanelProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div className="border border-line bg-panel p-3 md:col-span-2 lg:col-span-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Post metrics</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPullLive}
              disabled={loading}
              className="border border-cursor-glow px-2 py-0.5 font-mono text-[9px] uppercase text-cursor-glow disabled:opacity-50"
            >
              Pull live
            </button>
            <button
              type="button"
              onClick={onRefreshDemo}
              disabled={loading}
              className="border border-line px-2 py-0.5 font-mono text-[9px] uppercase text-muted hover:text-stark"
            >
              Demo
            </button>
          </div>
        </div>
        {!liveConfigured && (
          <p className="mb-2 font-mono text-[9px] text-muted">Live pull needs X or LinkedIn creds</p>
        )}
        {metrics.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">No metrics yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-[10px]">
            {metrics.slice(0, 8).map((m) => (
              <li key={m.postId} className="flex justify-between border border-line/40 px-2 py-1">
                <span className="text-cursor-glow">{m.postId}</span>
                <span className="text-muted">
                  {m.views}v · {m.likes}♥{m.ctr !== null ? ` · ${(m.ctr * 100).toFixed(1)}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Hook A/B</p>
        {hookPerformance.length === 0 ? (
          <p className="mt-2 font-mono text-[10px] text-muted">Generate hooks + ingest metrics.</p>
        ) : (
          <ul className="mt-2 space-y-1 font-mono text-[10px]">
            {hookPerformance.map((h) => (
              <li key={h.hookVariantId} className="border border-line/40 px-2 py-1">
                <span className="text-stark">{h.label}</span>
                <span className="ml-2 text-muted">
                  {Math.round(h.avgLikes)}♥ · n={h.samples}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line bg-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Thumb A/B</p>
        {thumbPerformance.length === 0 ? (
          <p className="mt-2 font-mono text-[10px] text-muted">Generate thumb variants + publish.</p>
        ) : (
          <ul className="mt-2 space-y-1 font-mono text-[10px]">
            {thumbPerformance.map((t) => (
              <li key={t.hookVariantId} className="border border-line/40 px-2 py-1">
                <span className="text-stark">{t.label}</span>
                <span className="ml-2 text-muted">{Math.round(t.avgViews)}v · n={t.samples}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line bg-panel p-3 md:col-span-2 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Recommendations</p>
          {onRefreshRecommendations ? (
            <button
              type="button"
              onClick={onRefreshRecommendations}
              className="border border-line px-2 py-0.5 text-[9px] uppercase text-muted hover:text-stark"
            >
              Refresh
            </button>
          ) : null}
        </div>
        {recommendations.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">Publish + pull metrics to learn winners.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recommendations.map((r) => (
              <li key={r.id} className="border border-line/50 p-2 font-mono text-[10px]">
                <p className="text-stark">{r.title}</p>
                <p className="mt-1 text-muted">{r.detail}</p>
                {onApplyRecommendation ? (
                  <button
                    type="button"
                    onClick={() => onApplyRecommendation(r)}
                    className="mt-2 border border-cursor-glow px-2 py-0.5 text-[9px] uppercase text-cursor-glow"
                  >
                    Apply
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
