"use client";

import { useState, useEffect, useCallback } from "react";
import { api, AnalyticsRow, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Eye, Heart, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import StatusBar from "@/components/StatusBar";

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

interface Row {
  id: string;
  numId?: number;
  text: string;
  platform: string;
  topic?: string | null;
  tweet_id?: string | null;
  auto_queue: boolean;
  date: string | null;
  status: string;
  source: "scheduler" | "draft";
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "var(--gold)",    bg: "rgba(255,184,0,0.1)"    },
  posted:    { label: "Posted",    color: "var(--green)",   bg: "rgba(34,197,94,0.1)"    },
  failed:    { label: "Failed",    color: "var(--red)",     bg: "rgba(239,68,68,0.1)"    },
  cancelled: { label: "Cancelled", color: "var(--t3)",      bg: "rgba(255,255,255,0.05)" },
  draft:     { label: "Draft",     color: "var(--t2)",      bg: "rgba(255,255,255,0.05)" },
};

const ALL_FILTERS = ["All", "Posted", "Scheduled", "Draft", "Failed"];

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
  const [filter, setFilter] = useState("All");

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
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.id)));
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

  const filteredRows = filter === "All"
    ? rows
    : rows.filter(r => r.status.toLowerCase() === filter.toLowerCase());

  const allChecked = filteredRows.length > 0 && filteredRows.every(r => selected.has(r.id));
  const someChecked = selected.size > 0;

  return (
    <>
      <div style={{ padding: "40px 48px", maxWidth: "1200px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
              ACTIVITY LOG
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
              History
            </h1>
          </div>

          {someChecked && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>{selected.size} selected</span>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: "13px", color: "var(--red)", fontWeight: 500 }}>Confirm delete?</span>
                  <button
                    onClick={deleteSelected}
                    disabled={deleting}
                    style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--red)", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={deleteSelected}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)", cursor: "pointer" }}
                >
                  <Trash2 size={13} />
                  Bulk Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status filter chips */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 500,
                background: filter === f ? "rgba(255,184,0,0.1)" : "var(--bg-card)",
                border: filter === f ? "1px solid rgba(255,184,0,0.35)" : "1px solid var(--border)",
                color: filter === f ? "var(--gold)" : "var(--t3)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {f}
              {f !== "All" && (
                <span style={{ marginLeft: "6px", fontSize: "10px", color: "inherit", opacity: 0.7 }}>
                  {rows.filter(r => r.status.toLowerCase() === f.toLowerCase()).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 110px 160px 130px 90px",
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-mid)",
            alignItems: "center",
          }}>
            <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "var(--gold)" }}
              />
            </label>
            {["Post", "Status", "Date", "Analytics", "Queue"].map((col) => (
              <span key={col} style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>
                {col}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--t3)" }} />
            </div>
          ) : filteredRows.length === 0 ? (
            <p style={{ padding: "48px 24px", fontSize: "13px", textAlign: "center", color: "var(--t3)" }}>No posts yet.</p>
          ) : (
            <div>
              {filteredRows.map((row, idx) => {
                const s = statusConfig[row.status] ?? statusConfig.draft;
                const analytics = row.tweet_id ? analyticsMap[row.tweet_id] : null;
                const isSelected = selected.has(row.id);
                const isToggling = togglingIds.has(row.id);

                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr 110px 160px 130px 90px",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderBottom: idx < filteredRows.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSelected ? "rgba(255,184,0,0.03)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                        style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "var(--gold)" }}
                      />
                    </label>

                    {/* Post text */}
                    <div style={{ paddingRight: "20px" }}>
                      {row.topic && row.topic !== "posted" && row.topic !== "scheduled" && row.topic !== "manual" && row.topic !== "batch" && (
                        <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gold)", display: "inline-block", marginBottom: "3px", background: "rgba(255,184,0,0.08)", padding: "1px 6px", borderRadius: "3px" }}>
                          {row.topic}
                        </span>
                      )}
                      <p style={{ fontSize: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--t2)", margin: 0, lineHeight: 1.5 }}>
                        {row.text}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span>
                      <span style={{ fontSize: "10px", padding: "3px 9px", borderRadius: "5px", fontWeight: 500, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>
                      {row.date ? new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>

                    {/* Analytics */}
                    {analytics ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)" }}>
                          <Eye size={10} />
                          {analytics.impressions.toLocaleString()}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)" }}>
                          <Heart size={10} />
                          {analytics.likes.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--ti)", fontFamily: "var(--font-mono)" }}>—</span>
                    )}

                    {/* Auto-queue toggle */}
                    {row.source === "draft" ? (
                      <button
                        onClick={() => toggleAutoQueue(row)}
                        disabled={isToggling}
                        title={row.auto_queue ? "Remove from auto-queue" : "Add to auto-queue"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: row.auto_queue ? "var(--gold)" : "var(--t3)", opacity: isToggling ? 0.4 : 1, display: "flex", alignItems: "center" }}
                      >
                        {row.auto_queue ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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

        {/* Pagination placeholder */}
        {filteredRows.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
            {[1, 2, 3].map(p => (
              <button
                key={p}
                style={{
                  width: "28px", height: "28px", borderRadius: "6px", fontSize: "12px",
                  background: p === 1 ? "rgba(255,184,0,0.1)" : "var(--bg-card)",
                  border: p === 1 ? "1px solid rgba(255,184,0,0.35)" : "1px solid var(--border)",
                  color: p === 1 ? "var(--gold)" : "var(--t3)",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Bottom cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
          {/* Engagement Velocity */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,184,0,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "12px" }}>Engagement Velocity</p>
            <p style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)" }}>
              {rows.filter(r => r.status === "posted").length}
              <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--t3)", marginLeft: "6px" }}>posts published</span>
            </p>
            <p style={{ fontSize: "12px", color: "var(--t3)", marginTop: "6px" }}>
              {rows.filter(r => r.status === "scheduled").length} scheduled · {rows.filter(r => r.status === "draft").length} drafts
            </p>
          </div>

          {/* Audit Log */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--t3)", marginBottom: "12px" }}>Recent Activity</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rows.slice(0, 3).map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusConfig[r.status]?.color ?? "var(--t3)", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.text.slice(0, 50)}…</span>
                  <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{statusConfig[r.status]?.label}</span>
                </div>
              ))}
              {rows.length === 0 && <p style={{ fontSize: "12px", color: "var(--ti)" }}>No activity yet</p>}
            </div>
          </div>
        </div>
      </div>
      <StatusBar />
    </>
  );
}
