"use client";

import { useState, useEffect, useCallback } from "react";
import { api, AnalyticsRow, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Eye, Heart, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface ScheduledPost {
  id: string;
  text: string;
  platform: string;
  topic?: string | null;
  tweet_id?: string | null;
  auto_queue?: boolean;
  scheduled_at: string | null;
  posted_at: string | null;
  status: string;
}

// Unified row type
interface Row {
  id: string;           // string for compatibility
  numId?: number;       // numeric id (for drafts)
  text: string;
  platform: string;
  topic?: string | null;
  tweet_id?: string | null;
  auto_queue: boolean;
  date: string | null;
  status: string;
  source: "scheduler" | "draft";
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scheduled: { label: "Scheduled", color: "var(--yellow)",     bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  posted:    { label: "Posted",    color: "var(--green)",      bg: "var(--green-dim)",  border: "var(--green-border)"  },
  failed:    { label: "Failed",    color: "var(--red)",        bg: "var(--red-dim)",    border: "var(--red-border)"    },
  cancelled: { label: "Cancelled", color: "var(--text-muted)", bg: "var(--surface-3)",  border: "var(--border-2)"      },
  draft:     { label: "Draft",     color: "var(--text-dim)",   bg: "var(--surface-2)",  border: "var(--border-2)"      },
};

function mergeRows(posts: ScheduledPost[], drafts: Draft[]): Row[] {
  const rows: Row[] = [
    ...posts.map((p) => ({
      id: p.id,
      text: p.text,
      platform: p.platform,
      topic: p.topic,
      tweet_id: p.tweet_id,
      auto_queue: p.auto_queue ?? false,
      date: p.posted_at ?? p.scheduled_at,
      status: p.status,
      source: "scheduler" as const,
    })),
    ...drafts.map((d) => ({
      id: String(d.id),
      numId: d.id,
      text: d.text,
      platform: d.platform,
      topic: d.topic,
      tweet_id: d.tweet_id,
      auto_queue: d.auto_queue,
      date: d.created_at,
      status: d.status,
      source: "draft" as const,
    })),
  ];
  // Sort by date desc
  rows.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return rows;
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, AnalyticsRow>>({});
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const project = store.getProject();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, draftsRes, analyticsRes] = await Promise.all([
        api.scheduler.list(project?.id) as Promise<{ posts: ScheduledPost[] }>,
        api.content.drafts(project?.id).catch(() => ({ drafts: [] as Draft[] })),
        api.analytics.posts(project?.id).catch(() => ({ analytics: [] as AnalyticsRow[] })),
      ]);
      setRows(mergeRows(postsRes.posts, draftsRes.drafts));
      const map: Record<string, AnalyticsRow> = {};
      for (const row of analyticsRes.analytics) {
        if (row.tweet_id) map[row.tweet_id] = row;
      }
      setAnalyticsMap(map);
    } catch { /* backend not running */ }
    finally { setLoading(false); }
  }, [project?.id]);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setConfirmDelete(false);
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
    setConfirmDelete(false);
  }

  async function deleteSelected() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const draftIds: number[] = [];
    const schedulerIds: string[] = [];
    for (const id of selected) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      if (row.source === "draft" && row.numId) draftIds.push(row.numId);
      else if (row.source === "scheduler" && row.status === "scheduled") schedulerIds.push(id);
    }
    try {
      if (draftIds.length > 0) await api.content.bulkDelete(draftIds);
      for (const id of schedulerIds) await api.scheduler.cancel(id);
      setRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      setConfirmDelete(false);
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  async function toggleAutoQueue(row: Row) {
    if (row.source !== "draft" || !row.numId) return;
    setTogglingIds((s) => new Set(s).add(row.id));
    try {
      const updated = await api.content.setAutoQueue(row.numId, !row.auto_queue);
      setRows((prev) =>
        prev.map((r) => r.id === row.id ? { ...r, auto_queue: updated.auto_queue } : r)
      );
    } catch { /* ignore */ }
    finally {
      setTogglingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0;

  return (
    <div style={{ padding: "52px 64px", maxWidth: "1140px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "8px", color: "var(--text)" }}>History</h2>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.5 }}>All drafts, scheduled, and posted content.</p>
        </div>
        {someChecked && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{selected.size} selected</span>
            {confirmDelete ? (
              <>
                <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: 500 }}>Confirm delete?</span>
                <button
                  onClick={deleteSelected}
                  disabled={deleting}
                  style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: "var(--red-dim)", border: "1px solid var(--red-border)", color: "var(--red)", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={deleteSelected}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <Trash2 size={13} />
                Delete selected
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 110px 160px 130px 100px",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
          alignItems: "center",
        }}>
          {/* Select all checkbox */}
          <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              style={{ width: "14px", height: "14px", cursor: "pointer" }}
            />
          </label>
          {["Post", "Status", "Date", "Analytics", "Queue"].map((col) => (
            <span key={col} style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              {col}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : rows.length === 0 ? (
          <p style={{ padding: "48px 24px", fontSize: "14px", textAlign: "center", color: "var(--text-muted)" }}>No posts yet.</p>
        ) : (
          <div>
            {rows.map((row, idx) => {
              const s = statusConfig[row.status] ?? statusConfig.draft;
              const analytics = row.tweet_id ? analyticsMap[row.tweet_id] : null;
              const isSelected = selected.has(row.id);
              const isToggling = togglingIds.has(row.id);

              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 110px 160px 130px 100px",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderBottom: idx < rows.length - 1 ? "1px solid var(--border)" : "none",
                    background: isSelected ? "var(--surface-2)" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Checkbox */}
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(row.id)}
                      style={{ width: "14px", height: "14px", cursor: "pointer" }}
                    />
                  </label>

                  {/* Post text */}
                  <div style={{ paddingRight: "20px" }}>
                    {row.topic && row.topic !== "posted" && row.topic !== "scheduled" && row.topic !== "manual" && row.topic !== "batch" && (
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-subtle)", display: "block", marginBottom: "3px" }}>
                        {row.topic}
                      </span>
                    )}
                    <p style={{ fontSize: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--text)", margin: 0 }}>
                      {row.text}
                    </p>
                  </div>

                  {/* Status */}
                  <span>
                    <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", fontWeight: 500, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                      {s.label}
                    </span>
                  </span>

                  {/* Date */}
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {row.date ? new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>

                  {/* Analytics */}
                  {analytics ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <Eye size={11} style={{ color: "var(--text-subtle)" }} />
                        {analytics.impressions.toLocaleString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <Heart size={11} style={{ color: "var(--text-subtle)" }} />
                        {analytics.likes.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>—</span>
                  )}

                  {/* Auto-queue toggle (drafts only) */}
                  {row.source === "draft" ? (
                    <button
                      onClick={() => toggleAutoQueue(row)}
                      disabled={isToggling}
                      title={row.auto_queue ? "Remove from auto-queue" : "Add to auto-queue"}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: row.auto_queue ? "var(--accent)" : "var(--text-muted)", opacity: isToggling ? 0.4 : 1, display: "flex", alignItems: "center" }}
                    >
                      {row.auto_queue ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
