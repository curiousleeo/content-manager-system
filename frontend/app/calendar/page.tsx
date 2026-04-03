"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, CalendarPost } from "@/lib/api";
import { store } from "@/lib/store";
import { ChevronLeft, ChevronRight, X, CalendarDays } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  scheduled: { color: "var(--blue)",       bg: "var(--blue-dim)",    border: "var(--blue-border)",   label: "Scheduled"  },
  posted:    { color: "var(--green)",      bg: "var(--green-dim)",   border: "var(--green-border)",  label: "Posted"     },
  failed:    { color: "var(--red)",        bg: "var(--red-dim)",     border: "var(--red-border)",    label: "Failed"     },
  draft:     { color: "var(--text-muted)", bg: "var(--surface-3)",   border: "var(--border-2)",      label: "Draft"      },
  reviewed:  { color: "var(--amber-text)", bg: "var(--amber-dim)",   border: "var(--amber-border)",  label: "Reviewed"   },
};

/** Format a UTC ISO string as "YYYY-MM-DD" in the given IANA timezone. */
function toTzDateKey(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { // en-CA produces YYYY-MM-DD
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(isoUtc));
}

/** Format a UTC ISO string for human display in the given timezone. */
function toTzLocaleString(isoUtc: string, tz: string): string {
  return new Date(isoUtc).toLocaleString(undefined, {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDateKey(post: CalendarPost, tz: string): string | null {
  const raw = post.status === "posted" ? (post.posted_at ?? post.scheduled_at) : post.scheduled_at;
  if (!raw) return null;
  try {
    return toTzDateKey(raw, tz);
  } catch {
    return raw.slice(0, 10); // fallback: treat as-is if tz is invalid
  }
}

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<CalendarPost | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  // Drag state
  const draggingId = useRef<number | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  useEffect(() => {
    setProject(store.getProject());
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, project]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.calendar.list(project?.id, year, month);
      setPosts(res.posts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // Build grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const projectTz: string = project?.timezone || "UTC";

  // Group posts by date key in the project's timezone
  const byDate: Record<string, CalendarPost[]> = {};
  for (const p of posts) {
    const k = getDateKey(p, projectTz);
    if (k) {
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(p);
    }
  }

  function dateKey(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function isToday(day: number) {
    return year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
  }

  // Drag handlers
  function onDragStart(post: CalendarPost) {
    draggingId.current = post.id;
  }

  function onDragOver(e: React.DragEvent, day: number) {
    e.preventDefault();
    setDraggingOver(dateKey(day));
  }

  function onDragLeave() {
    setDraggingOver(null);
  }

  async function onDrop(e: React.DragEvent, day: number) {
    e.preventDefault();
    setDraggingOver(null);
    if (draggingId.current == null) return;
    const id = draggingId.current;
    draggingId.current = null;

    const newDate = dateKey(day);
    const post = posts.find(p => p.id === id);
    if (!post) return;

    // Keep the time from original scheduled_at, just change date
    const originalTime = post.scheduled_at ? post.scheduled_at.slice(11, 19) : "09:00:00";
    const newScheduledAt = `${newDate}T${originalTime}`;

    try {
      const updated = await api.calendar.reschedule(id, newScheduledAt);
      setPosts(prev => prev.map(p => p.id === id ? updated : p));
    } catch {
      /* ignore */
    }
  }

  function onEmptyDayClick(day: number) {
    const d = dateKey(day);
    router.push(`/content?date=${d}`);
  }

  const style = {
    section: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      overflow: "hidden",
    } as React.CSSProperties,
  };

  return (
    <div style={{ padding: "52px 64px", maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <CalendarDays size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Calendar</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "28px", lineHeight: 1.5 }}>
          View and reschedule posts. Drag to move, click an empty day to generate.
        </p>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={prevMonth}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", minWidth: "200px", textAlign: "center" }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
        >
          <ChevronRight size={16} />
        </button>
        {loading && <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>Loading…</span>}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        {Object.entries(STATUS_STYLE).map(([s, cfg]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: cfg.bg, border: `1px solid ${cfg.border}` }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ ...style.section }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < cells.length / 7 - 1 ? "1px solid var(--border)" : "none" }}>
            {cells.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
              const dk = day ? dateKey(day) : null;
              const dayPosts = dk ? (byDate[dk] ?? []) : [];
              const isDragTarget = dk === draggingOver;

              return (
                <div
                  key={ci}
                  onDragOver={day ? (e) => onDragOver(e, day) : undefined}
                  onDragLeave={day ? onDragLeave : undefined}
                  onDrop={day ? (e) => onDrop(e, day) : undefined}
                  onClick={day && dayPosts.length === 0 ? () => onEmptyDayClick(day) : undefined}
                  style={{
                    minHeight: "110px",
                    padding: "8px",
                    borderRight: ci < 6 ? "1px solid var(--border)" : "none",
                    background: isDragTarget ? "var(--accent-dim)" : day ? "transparent" : "rgba(0,0,0,0.15)",
                    cursor: day && dayPosts.length === 0 ? "pointer" : "default",
                    transition: "background 0.1s",
                    position: "relative",
                  }}
                >
                  {day && (
                    <>
                      <div style={{
                        fontSize: "12px",
                        fontWeight: isToday(day) ? 700 : 400,
                        color: isToday(day) ? "var(--accent-light)" : "var(--text-muted)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}>
                        {isToday(day) && (
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                        )}
                        {day}
                      </div>

                      {/* Post cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        {dayPosts.map(post => {
                          const s = STATUS_STYLE[post.status] ?? STATUS_STYLE.draft;
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={() => onDragStart(post)}
                              onClick={(e) => { e.stopPropagation(); setExpanded(post); }}
                              title={post.text}
                              style={{
                                padding: "4px 7px",
                                borderRadius: "5px",
                                fontSize: "11px",
                                lineHeight: "1.4",
                                color: s.color,
                                background: s.bg,
                                border: `1px solid ${s.border}`,
                                cursor: "grab",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                userSelect: "none",
                              }}
                            >
                              {post.text.slice(0, 40)}{post.text.length > 40 ? "…" : ""}
                            </div>
                          );
                        })}

                        {/* Empty day hint */}
                        {dayPosts.length === 0 && (
                          <div style={{ fontSize: "10px", color: "var(--text-subtle)", opacity: 0, transition: "opacity 0.15s" }}
                            className="empty-hint">
                            + Generate
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Post expand modal */}
      {expanded && (
        <div
          onClick={() => setExpanded(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)", border: "1px solid var(--border-2)",
              borderRadius: "16px", padding: "28px", width: "520px", maxWidth: "90vw",
              position: "relative", maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <button
              onClick={() => setExpanded(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>

            {/* Status badge */}
            {(() => {
              const s = STATUS_STYLE[expanded.status] ?? STATUS_STYLE.draft;
              return (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", background: s.bg, border: `1px solid ${s.border}`, marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: s.color, fontWeight: 500 }}>{s.label}</span>
                </div>
              );
            })()}

            {/* Pillar */}
            {expanded.topic && (
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", padding: "2px 8px", borderRadius: "4px" }}>
                  {expanded.topic}
                </span>
              </div>
            )}

            {/* Post text */}
            <p style={{ fontSize: "15px", color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {expanded.text}
            </p>

            {/* Meta */}
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {expanded.scheduled_at && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginBottom: "2px" }}>Scheduled</p>
                  <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>{toTzLocaleString(expanded.scheduled_at, projectTz)}</p>
                </div>
              )}
              {expanded.posted_at && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginBottom: "2px" }}>Posted</p>
                  <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>{toTzLocaleString(expanded.posted_at, projectTz)}</p>
                </div>
              )}
              {projectTz !== "UTC" && (
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginBottom: "2px" }}>Timezone</p>
                  <p style={{ fontSize: "13px", color: "var(--text-dim)", fontFamily: "monospace" }}>{projectTz}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        div:hover > .empty-hint { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
