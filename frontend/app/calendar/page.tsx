"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, CalendarPost } from "@/lib/api";
import { store } from "@/lib/store";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import StatusBar from "@/components/StatusBar";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  scheduled: { color: "var(--gold)",    bg: "rgba(255,184,0,0.12)",       label: "Scheduled" },
  posted:    { color: "var(--green)",   bg: "rgba(34,197,94,0.15)",       label: "Posted"    },
  failed:    { color: "var(--red)",     bg: "rgba(239,68,68,0.12)",       label: "Failed"    },
  draft:     { color: "var(--t3)",      bg: "rgba(255,255,255,0.06)",     label: "Draft"     },
  reviewed:  { color: "var(--purple-l)","bg": "rgba(107,47,217,0.12)",   label: "Reviewed"  },
};

/** Format a UTC ISO string as "YYYY-MM-DD" in the given IANA timezone. */
function toTzDateKey(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
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
    return raw.slice(0, 10);
  }
}

type ViewMode = "month" | "week" | "day";

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<CalendarPost | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const projectTz: string = project?.timezone || "UTC";

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

    const originalTime = post.scheduled_at ? post.scheduled_at.slice(11, 19) : "09:00:00";
    const newScheduledAt = `${newDate}T${originalTime}`;

    try {
      const updated = await api.calendar.reschedule(id, newScheduledAt);
      setPosts(prev => prev.map(p => p.id === id ? updated : p));
    } catch { /* ignore */ }
  }

  function onEmptyDayClick(day: number) {
    const d = dateKey(day);
    router.push(`/content?date=${d}`);
  }

  return (
    <>
      <div style={{ padding: "32px 36px 64px", maxWidth: "1160px" }}>

        {/* Calendar header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
          {/* Month title */}
          <h1 style={{
            fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-manrope)",
            color: "var(--t1)", letterSpacing: "-1px", margin: 0, flex: 1,
          }}>
            {MONTHS[month - 1]} {year}
            {loading && (
              <span style={{ fontSize: "11px", color: "var(--t3)", marginLeft: "8px", fontWeight: 400, fontFamily: "var(--font-mono)" }}>…</span>
            )}
          </h1>

          {/* Nav buttons */}
          <button
            onClick={prevMonth}
            style={{
              width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px",
              cursor: "pointer", color: "var(--t3)",
            }}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={nextMonth}
            style={{
              width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "6px",
              cursor: "pointer", color: "var(--t3)",
            }}
          >
            <ChevronRight size={13} />
          </button>

          {/* Today button */}
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            style={{
              padding: "5px 13px", borderRadius: "6px", border: "1px solid var(--border)",
              background: "var(--bg-card)", fontSize: "11.5px", fontWeight: 600, color: "var(--t1)",
              cursor: "pointer",
            }}
          >
            Today
          </button>

          {/* View toggle */}
          <div style={{
            display: "flex", gap: "2px", background: "var(--bg-card)",
            border: "1px solid var(--border)", borderRadius: "7px", padding: "2px",
          }}>
            {(["Month", "Week", "Day"] as string[]).map(v => {
              const key = v.toLowerCase() as ViewMode;
              const active = viewMode === key;
              return (
                <button
                  key={v}
                  onClick={() => setViewMode(key)}
                  style={{
                    padding: "4px 11px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 600,
                    background: active ? "var(--gold)" : "transparent",
                    border: "none",
                    color: active ? "#1a1000" : "var(--ti)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar grid — gap:1px + bg:border creates grid lines */}
        <div style={{
          display: "grid", gap: "1px", background: "var(--border)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border)" }}>
            {DAYS.map(d => (
              <div key={d} style={{
                background: "var(--bg-mid)", padding: "9px", textAlign: "center",
                fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "1px", color: "var(--t3)",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {Array.from({ length: cells.length / 7 }, (_, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border)" }}>
              {cells.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
                const dk = day ? dateKey(day) : null;
                const dayPosts = dk ? (byDate[dk] ?? []) : [];
                const isDragTarget = dk === draggingOver;
                const todayDay = day && isToday(day);
                const otherMonth = !day;

                return (
                  <div
                    key={ci}
                    onDragOver={day ? (e) => onDragOver(e, day) : undefined}
                    onDragLeave={day ? onDragLeave : undefined}
                    onDrop={day ? (e) => onDrop(e, day) : undefined}
                    onClick={day && dayPosts.length === 0 ? () => onEmptyDayClick(day) : undefined}
                    style={{
                      minHeight: "88px",
                      padding: "8px 9px",
                      background: isDragTarget
                        ? "rgba(255,184,0,0.06)"
                        : todayDay
                          ? "rgba(255,184,0,0.04)"
                          : day
                            ? "var(--bg-base)"
                            : "rgba(0,0,0,0.2)",
                      outline: todayDay ? "1px solid rgba(255,184,0,0.3)" : "none",
                      outlineOffset: "-1px",
                      opacity: otherMonth ? 0.3 : 1,
                      cursor: day && dayPosts.length === 0 ? "pointer" : "default",
                      transition: "background 0.1s",
                    }}
                  >
                    {day && (
                      <>
                        {/* Day number */}
                        <div style={{ marginBottom: "5px" }}>
                          {todayDay ? (
                            <div style={{
                              width: "21px", height: "21px", borderRadius: "50%",
                              background: "var(--gold)", display: "inline-flex",
                              alignItems: "center", justifyContent: "center",
                              fontSize: "10px", fontWeight: 700, color: "#1a1000",
                              fontFamily: "var(--font-manrope)",
                            }}>
                              {day}
                            </div>
                          ) : (
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--t3)" }}>{day}</span>
                          )}
                        </div>

                        {/* Event chips */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {dayPosts.map(post => {
                            const s = STATUS_STYLE[post.status] ?? STATUS_STYLE.draft;
                            const statusLabel = post.status === "posted"
                              ? "POSTED"
                              : post.status === "scheduled"
                                ? "SCHEDULED"
                                : "DRAFT";
                            const preview = post.text.slice(0, 28);
                            return (
                              <div
                                key={post.id}
                                draggable
                                onDragStart={() => onDragStart(post)}
                                onClick={(e) => { e.stopPropagation(); setExpanded(post); }}
                                title={post.text}
                                style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "9.5px",
                                  lineHeight: "1.4",
                                  color: s.color,
                                  background: s.bg,
                                  cursor: "grab",
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                  userSelect: "none",
                                  marginBottom: "3px",
                                }}
                              >
                                {statusLabel} · {preview}{post.text.length > 28 ? "…" : ""}
                              </div>
                            );
                          })}

                          {dayPosts.length === 0 && (
                            <div
                              className="empty-hint"
                              style={{ fontSize: "10px", color: "var(--t3)", opacity: 0, transition: "opacity 0.15s" }}
                            >
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

        {/* Legend */}
        <div style={{ display: "flex", gap: "18px", marginTop: "14px", flexWrap: "wrap" }}>
          {Object.entries(STATUS_STYLE).map(([s, cfg]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--t3)" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: cfg.bg }} />
              <span>{cfg.label}</span>
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
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "16px", padding: "28px", width: "520px", maxWidth: "90vw",
                position: "relative", maxHeight: "80vh", overflowY: "auto",
              }}
            >
              <button
                onClick={() => setExpanded(null)}
                style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "var(--t3)" }}
              >
                <X size={16} />
              </button>

              {(() => {
                const s = STATUS_STYLE[expanded.status] ?? STATUS_STYLE.draft;
                return (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", background: s.bg, marginBottom: "16px", borderLeft: `2px solid ${s.color}` }}>
                    <span style={{ fontSize: "12px", color: s.color, fontWeight: 500 }}>{s.label}</span>
                  </div>
                );
              })()}

              {expanded.topic && (
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", color: "var(--gold)", background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.25)", padding: "2px 8px", borderRadius: "4px" }}>
                    {expanded.topic}
                  </span>
                </div>
              )}

              <p style={{ fontSize: "15px", color: "var(--t1)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {expanded.text}
              </p>

              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {expanded.scheduled_at && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "2px" }}>Scheduled</p>
                    <p style={{ fontSize: "13px", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>{toTzLocaleString(expanded.scheduled_at, projectTz)}</p>
                  </div>
                )}
                {expanded.posted_at && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "2px" }}>Posted</p>
                    <p style={{ fontSize: "13px", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>{toTzLocaleString(expanded.posted_at, projectTz)}</p>
                  </div>
                )}
                {projectTz !== "UTC" && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "2px" }}>Timezone</p>
                    <p style={{ fontSize: "13px", color: "var(--t2)", fontFamily: "var(--font-mono)" }}>{projectTz}</p>
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
      <StatusBar />
    </>
  );
}
