"use client";

import { useState, useEffect, useCallback } from "react";
import { api, AnalyticsRow, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Eye, Heart, Trash2, ToggleLeft, ToggleRight, MoreHorizontal, Lock } from "lucide-react";
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

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, AnalyticsRow>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function getPillarColor(topic?: string | null): { color: string; bg: string } {
    if (!topic) return { color: "var(--t2)", bg: "rgba(255,255,255,0.06)" };
    const map: Record<string, { color: string; bg: string }> = {
      education:  { color: "#93c5fd", bg: "rgba(147,197,253,0.12)" },
      authority:  { color: "var(--gold)", bg: "rgba(255,184,0,0.12)" },
      conversion: { color: "var(--green)", bg: "rgba(34,197,94,0.12)" },
      community:  { color: "var(--purple-l)", bg: "rgba(107,47,217,0.12)" },
      growth:     { color: "#f5b84a", bg: "rgba(245,184,74,0.12)" },
    };
    return map[topic.toLowerCase()] ?? { color: "var(--t2)", bg: "rgba(255,255,255,0.06)" };
  }

  return (
    <>
      <div style={{ padding: "32px 36px 80px", maxWidth: "1200px" }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <div>
            <h1 style={{
              fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-manrope)",
              color: "var(--t1)", letterSpacing: "-1px", margin: "0 0 4px",
            }}>
              Historical Records
            </h1>
            <p style={{ fontSize: "13px", color: "var(--t3)", maxWidth: "500px", margin: 0 }}>
              A sovereign archive of all automated interactions, published content, and performance metrics.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Status filter button */}
            <button
              style={{
                padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 600,
                background: "transparent", border: "1px solid var(--border)", color: "var(--t2)",
                cursor: "pointer",
              }}
            >
              Filter
            </button>

            {/* Bulk Delete */}
            {someChecked && (
              confirmDelete ? (
                <>
                  <span style={{ fontSize: "12px", color: "var(--red)", fontWeight: 500 }}>Confirm delete?</span>
                  <button
                    onClick={deleteSelected}
                    disabled={deleting}
                    style={{
                      padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 600,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "var(--red)", cursor: "pointer", opacity: deleting ? 0.5 : 1,
                      display: "flex", alignItems: "center", gap: "5px",
                    }}
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px",
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      color: "var(--t3)", cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={deleteSelected}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "5px 12px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 600,
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "var(--red)", cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} />
                  Bulk Delete
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>{selected.size}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Status filter chips */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "22px", flexWrap: "wrap" }}>
          {ALL_FILTERS.map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "5px 13px", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600, letterSpacing: "0.7px", textTransform: "uppercase",
                  cursor: "pointer", transition: "all .15s",
                  background: active ? "var(--gold)" : "transparent",
                  border: active ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,.1)",
                  color: active ? "#1a1000" : "var(--t2)",
                }}
              >
                {f}
                {f !== "All" && (
                  <span style={{ marginLeft: "5px", fontSize: "10px", opacity: 0.75 }}>
                    {rows.filter(r => r.status.toLowerCase() === f.toLowerCase()).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "22px" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 140px 1fr 100px 90px 90px 80px 40px",
            padding: "9px 14px",
            borderBottom: "1px solid var(--border)",
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
            {["Date", "Post", "Pillar", "Status", "Impressions", "Likes", ""].map((col, i) => (
              <span key={i} style={{
                fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "1.5px", color: "var(--t3)",
              }}>
                {col}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--t3)" }} />
            </div>
          ) : pagedRows.length === 0 ? (
            <p style={{ padding: "48px 24px", fontSize: "13px", textAlign: "center", color: "var(--t3)" }}>No posts yet.</p>
          ) : (
            <div>
              {pagedRows.map((row, idx) => {
                const s = statusConfig[row.status] ?? statusConfig.draft;
                const analytics = row.tweet_id ? analyticsMap[row.tweet_id] : null;
                const isSelected = selected.has(row.id);
                const isToggling = togglingIds.has(row.id);
                const pillar = getPillarColor(row.topic);
                const rowDate = row.date ? new Date(row.date) : null;
                const isLast = idx === pagedRows.length - 1;

                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 140px 1fr 100px 90px 90px 80px 40px",
                      alignItems: "center",
                      padding: "13px 14px",
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                      fontSize: "12px",
                      color: "var(--t2)",
                      background: isSelected ? "rgba(255,184,0,0.03)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)"; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Checkbox */}
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                        style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "var(--gold)" }}
                      />
                    </label>

                    {/* Date */}
                    <div>
                      {rowDate ? (
                        <>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--t1)" }}>
                            {rowDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--t3)", marginTop: "1px" }}>
                            {rowDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--ti)", fontFamily: "var(--font-mono)" }}>—</span>
                      )}
                    </div>

                    {/* Post preview */}
                    <div style={{ paddingRight: "16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        {/* Thumbnail placeholder */}
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "4px", flexShrink: 0,
                          background: "var(--bg-elev)", display: "flex", alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <span style={{ fontSize: "8px", color: "var(--t3)" }}>
                            {row.platform.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: "12px", color: "var(--t2)", margin: "0 0 2px",
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5,
                          }}>
                            {row.text}
                          </p>
                          {row.tweet_id && (
                            <a
                              href={`https://twitter.com/i/web/status/${row.tweet_id}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: "10px", color: "var(--t3)", textDecoration: "none" }}
                              onClick={e => e.stopPropagation()}
                            >
                              View post ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pillar badge */}
                    <div>
                      {row.topic && row.topic !== "posted" && row.topic !== "scheduled" && row.topic !== "manual" && row.topic !== "batch" ? (
                        <span style={{
                          fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: "0.08em", padding: "3px 7px", borderRadius: "4px",
                          color: pillar.color, background: pillar.bg,
                        }}>
                          {row.topic}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ti)", fontFamily: "var(--font-mono)" }}>—</span>
                      )}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span style={{
                        fontSize: "10px", padding: "3px 9px", borderRadius: "5px",
                        fontWeight: 600, background: s.bg, color: s.color,
                        letterSpacing: "0.4px", textTransform: "uppercase",
                      }}>
                        {s.label}
                      </span>
                    </div>

                    {/* Impressions */}
                    <div>
                      {analytics ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>
                          <Eye size={11} style={{ color: "var(--t3)" }} />
                          {analytics.impressions.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--ti)", fontFamily: "var(--font-mono)" }}>—</span>
                      )}
                    </div>

                    {/* Likes */}
                    <div>
                      {analytics ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                          <Heart size={11} />
                          {analytics.likes.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--ti)", fontFamily: "var(--font-mono)" }}>—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {row.source === "draft" ? (
                        <button
                          onClick={() => toggleAutoQueue(row)}
                          disabled={isToggling}
                          title={row.auto_queue ? "Remove from auto-queue" : "Add to auto-queue"}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: "2px",
                            color: row.auto_queue ? "var(--gold)" : "var(--t3)",
                            opacity: isToggling ? 0.4 : 1, display: "flex", alignItems: "center",
                          }}
                        >
                          {row.auto_queue ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                      ) : null}
                      <button style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--t3)", padding: "2px", display: "flex", alignItems: "center",
                      }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table footer */}
          {!loading && filteredRows.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 18px", borderTop: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "11px", color: "var(--t3)" }}>
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredRows.length)}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
              </span>
              {/* Pagination */}
              <div style={{ display: "flex", gap: "5px" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: "26px", height: "26px", borderRadius: "5px",
                      fontSize: "11px", fontWeight: 600,
                      background: p === page ? "var(--gold)" : "var(--bg-card)",
                      border: p === page ? "1px solid var(--gold)" : "1px solid var(--border)",
                      color: p === page ? "#1a1000" : "var(--t2)",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom 2-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px" }}>
          {/* Engagement Velocity */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "20px", overflow: "hidden", position: "relative",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, rgba(255,184,0,0.06) 0%, transparent 60%)",
              pointerEvents: "none",
            }} />
            <p style={{
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase",
              color: "var(--gold)", marginBottom: "12px",
            }}>Engagement Velocity</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)" }}>
                {rows.filter(r => r.status === "posted").length}
              </span>
              <span style={{ fontSize: "13px", color: "var(--t3)" }}>posts published</span>
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--gold)" }}>
                {rows.filter(r => r.status === "scheduled").length} scheduled
              </span>
              <span style={{ fontSize: "12px", color: "var(--t3)" }}>
                {rows.filter(r => r.status === "draft").length} drafts
              </span>
            </div>
          </div>

          {/* Audit Logs */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Lock size={13} style={{ color: "var(--t3)" }} />
              <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--t3)", margin: 0 }}>
                Audit Logs
              </p>
            </div>
            <p style={{ fontSize: "12px", color: "var(--t2)", marginBottom: "12px", lineHeight: 1.5 }}>
              Full tamper-evident record of all system actions, API calls, and post events for compliance and debugging.
            </p>
            <a href="#" style={{ fontSize: "12px", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
              View Full Security Log →
            </a>
          </div>
        </div>
      </div>
      <StatusBar />
    </>
  );
}
