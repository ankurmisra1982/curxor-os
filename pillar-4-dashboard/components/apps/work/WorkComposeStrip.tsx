"use client";

import { useMemo, useState } from "react";

interface WorkComposeStripSimpleProps {
  mailId: string | null;
  draftPreview: string;
  onDraftReply: (mailId: string, prompt?: string) => void;
  onSendReply?: (mailId: string, subject: string, body: string) => void;
  onClear: () => void;
  sendBusy?: boolean;
}

interface WorkComposeStripEditorProps {
  subject: string;
  body: string;
  busy?: boolean;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onDraftReply: () => void;
}

type WorkComposeStripProps = WorkComposeStripSimpleProps | WorkComposeStripEditorProps;

function isSimple(props: WorkComposeStripProps): props is WorkComposeStripSimpleProps {
  return "mailId" in props;
}

export function WorkComposeStrip(props: WorkComposeStripProps) {
  if (isSimple(props)) {
    const { mailId, draftPreview, onDraftReply, onSendReply, onClear, sendBusy } = props;
    const [prompt, setPrompt] = useState("");
    const lines = draftPreview.split("\n");
    const subject = lines[0] ?? "";
    const body = lines.slice(1).join("\n").trim();

    return (
      <div className="mt-3 space-y-2 border border-line/60 bg-panel/40 p-2 font-mono text-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="uppercase tracking-widest text-muted">Compose strip</span>
          <div className="flex gap-1">
            {draftPreview ? (
              <button type="button" onClick={onClear} className="border border-line px-1.5 py-0.5 uppercase text-muted">
                Clear
              </button>
            ) : null}
            <button
              type="button"
              disabled={!mailId}
              onClick={() => mailId && onDraftReply(mailId, prompt || undefined)}
              className="border border-cursor-glow px-1.5 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
            >
              Draft reply
            </button>
            {onSendReply && draftPreview ? (
              <button
                type="button"
                disabled={!mailId || sendBusy}
                onClick={() => {
                  if (!mailId) return;
                  const lines = draftPreview.split("\n");
                  const subject = lines[0] ?? "Re:";
                  const body = lines.slice(1).join("\n").trim();
                  onSendReply(mailId, subject, body);
                }}
                className="border border-stark px-1.5 py-0.5 uppercase text-stark disabled:opacity-40"
              >
                {sendBusy ? "Sending…" : "Send reply"}
              </button>
            ) : null}
          </div>
        </div>
        <input
          className="w-full border border-line bg-panel px-2 py-1 text-stark"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional prompt for LLM draft"
        />
        {draftPreview ? (
          <div className="border border-line/40 px-2 py-1">
            <p className="text-stark">{subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-muted">{body}</p>
          </div>
        ) : (
          <p className="text-muted">Select mail and draft — or use templates from Home.</p>
        )}
      </div>
    );
  }

  const { subject, body, busy, onSubjectChange, onBodyChange, onDraftReply } = props;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2 border border-line/60 bg-panel/40 p-2 font-mono text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="uppercase tracking-widest text-muted">Compose</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="border border-line px-1.5 py-0.5 uppercase text-muted hover:text-stark"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDraftReply}
            className="border border-cursor-glow px-1.5 py-0.5 uppercase text-cursor-glow disabled:opacity-40"
          >
            {busy ? "Drafting…" : "Draft reply"}
          </button>
        </div>
      </div>
      <input
        className="w-full border border-line bg-panel px-2 py-1 text-stark"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
        placeholder="Subject"
      />
      {expanded ? (
        <textarea
          className="min-h-[120px] w-full border border-line bg-panel px-2 py-1 text-stark"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Body"
        />
      ) : (
        <p className="line-clamp-2 text-muted">{body || "— draft body —"}</p>
      )}
    </div>
  );
}
