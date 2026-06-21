"use client";

import { useState } from "react";

export interface DraftCommentRow {
  id: string;
  postId: string;
  author: string;
  text: string;
  action: string;
  createdAt: string;
}

interface ContentTeamPanelProps {
  comments: DraftCommentRow[];
  selectedPostId: string | null;
  onRefresh: () => void;
  onAddComment: (postId: string, text: string, action: string) => void;
}

export function ContentTeamPanel({ comments, selectedPostId, onRefresh, onAddComment }: ContentTeamPanelProps) {
  const [text, setText] = useState("");
  const [action, setAction] = useState("comment");

  return (
    <div className="space-y-3 font-mono text-[10px]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Review note for selected post…"
        className="w-full border border-line bg-void p-2 text-stark"
      />
      <div className="flex flex-wrap gap-2">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-line bg-void px-2 py-1">
          <option value="comment">Comment</option>
          <option value="request_changes">Request changes</option>
          <option value="approve">Approve draft</option>
        </select>
        <button
          type="button"
          disabled={!selectedPostId || !text.trim()}
          onClick={() => {
            if (selectedPostId) {
              onAddComment(selectedPostId, text, action);
              setText("");
            }
          }}
          className="border border-line px-2 py-0.5 uppercase hover:border-cursor-glow disabled:opacity-50"
        >
          Add review
        </button>
        <button type="button" onClick={onRefresh} className="border border-line px-2 py-0.5 uppercase text-muted">
          Refresh
        </button>
      </div>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {comments.length === 0 ? (
          <li className="text-muted">No review comments yet.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="border border-line/60 p-2">
              <div className="flex justify-between gap-2">
                <span className="text-cursor-glow">{c.author}</span>
                <span className={c.action === "request_changes" ? "text-amber-400" : c.action === "approve" ? "text-cursor-glow" : "text-muted"}>
                  {c.action.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-stark">{c.text}</p>
              <p className="mt-1 text-muted">{c.postId}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
