"use client";

export interface ContentJobRow {
  id: string;
  postId: string;
  type: string;
  status: string;
  error: string | null;
  attempts?: number;
  nextRunAt?: string | null;
  updatedAt: string;
}

interface ContentJobsPanelProps {
  jobs: ContentJobRow[];
}

export function ContentJobsPanel({ jobs }: ContentJobsPanelProps) {
  if (jobs.length === 0) {
    return <p className="font-mono text-[10px] text-muted">No render jobs queued.</p>;
  }

  return (
    <ul className="space-y-1 font-mono text-[10px]">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center justify-between border border-line/50 px-2 py-1">
          <span>
            <span className="text-cursor-glow">{job.type}</span>
            <span className="text-muted"> · {job.postId}</span>
          </span>
          <span
            className={
              job.status === "done"
                ? "text-cursor-glow"
                : job.status === "failed"
                  ? "text-cursor-glow"
                  : "text-muted"
            }
          >
            {job.status}
            {job.attempts ? ` · try ${job.attempts}` : ""}
            {job.error ? ` — ${job.error.slice(0, 40)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
