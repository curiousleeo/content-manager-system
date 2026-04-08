"use client";

import { useState, useEffect } from "react";
import { api, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Send, RefreshCw, X as XIcon, Loader2, Calendar, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import StatusBar from "@/components/StatusBar";

interface ScheduledPost {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string;
  status: "scheduled" | "posted" | "failed" | "cancelled";
  posted_at?: string;
  error?: string;
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scheduled:  { label: "Scheduled",  color: "var(--gold)",   bg: "rgba(255,184,0,0.10)",  border: "rgba(255,184,0,0.25)"   },
  posted:     { label: "Posted",     color: "var(--green)",  bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.22)"   },
  failed:     { label: "Failed",     color: "var(--red)",    bg: "rgba(239,68,68,0.09)",   border: "rgba(239,68,68,0.22)"   },
  cancelled:  { label: "Cancelled",  color: "var(--t3)",     bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
};

// Mini calendar helpers
const MONTH_DAYS = [0,31,28,31,30,31,30,31,31,30,31,30,31];
const DAY_LABELS = ["M","T","W","T","F","S","S"];

export default function SchedulePage() {
  const [text, setText]           = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading]     = useState(false);
  const [posting, setPosting]     = useState(false);
  const [posts, setPosts]         = useState<ScheduledPost[]>([]);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const [drafts, setDrafts]               = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [autoQueue, setAutoQueue]         = useState(false);
  const [togglingQueue, setTogglingQueue] = useState(false);
  const [fromDB, setFromDB]               = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject]             = useState<any>(null);

  // Mini calendar state
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    const saved = store.getContent();
    if (saved) { setText(saved); }
    else { setPickerOpen(true); loadDrafts(proj?.id); setFromDB(true); }
    loadPosts(proj?.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selectedDay → scheduledAt
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    setScheduledAt(`${calYear}-${pad(calMonth)}-${pad(selectedDay)}T14:00`);
  }, [calYear, calMonth, selectedDay]);

  async function loadDrafts(projectId?: number) {
    setDraftsLoading(true);
    try { const res = await api.content.drafts(projectId); setDrafts(res.drafts); }
    catch { /**/ } finally { setDraftsLoading(false); }
  }

  function selectDraft(draft: Draft) {
    setText(draft.text); store.setContent(draft.text);
    setSelectedDraftId(draft.id); setAutoQueue(draft.auto_queue); setPickerOpen(false);
  }

  async function toggleAutoQueue() {
    if (!selectedDraftId) return; setTogglingQueue(true);
    try {
      const updated = await api.content.setAutoQueue(selectedDraftId, !autoQueue);
      setAutoQueue(updated.auto_queue);
      setDrafts((prev) => prev.map((d) => d.id === selectedDraftId ? { ...d, auto_queue: updated.auto_queue } : d));
    } catch { /**/ } finally { setTogglingQueue(false); }
  }

  async function loadPosts(projectId?: number) {
    try { const res = await api.scheduler.list(projectId) as { posts: ScheduledPost[] }; setPosts(res.posts); }
    catch { /**/ }
  }

  async function schedule() {
    if (!text.trim() || !scheduledAt) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.scheduler.schedule(text, new Date(scheduledAt).toISOString(), "x", project?.id);
      setSuccess("Scheduled."); await loadPosts(project?.id);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true); setError(""); setSuccess("");
    try { await api.content.postNow(text, "x", project?.id); setSuccess("Posted."); }
    catch (e) { setError((e as Error).message); } finally { setPosting(false); }
  }

  async function cancel(id: string) {
    try { await api.scheduler.cancel(id); await loadPosts(project?.id); }
    catch (e) { setError((e as Error).message); }
  }

  // Mini calendar calculations
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
  const firstMon = firstDow === 0 ? 6 : firstDow - 1; // Monday-based offset
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  // Previous month fill
  const prevMonthDays = calMonth === 1
    ? MONTH_DAYS[12]
    : new Date(calYear, calMonth - 1, 0).getDate();
  const calCells: { day: number; cur: boolean }[] = [];
  for (let i = firstMon - 1; i >= 0; i--) calCells.push({ day: prevMonthDays - i, cur: false });
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d, cur: true });
  while (calCells.length < 35) calCells.push({ day: calCells.length - daysInMonth - firstMon + 1, cur: false });

  const scheduled = posts.filter((p) => p.status === "scheduled");

  return (
    <>
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
          Publish Queue
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
          <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1 }}>
            Temporal Engine
          </h1>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "20px", color: "var(--gold)", letterSpacing: "2px" }}>
            {scheduledAt.slice(11, 16) || "14:00"}
          </span>
        </div>
      </div>

      {fromDB && (
        <div style={{ padding: "10px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)", fontSize: "12px", color: "var(--blue)" }}>
          Loaded from DB — pick a draft below. Start pipeline from Research to use fresh data.
        </div>
      )}

      {/* ── Top two cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px", marginBottom: "32px" }}>

        {/* Date picker card */}
        <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "5px" }}>Set Parameters</p>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "20px", fontWeight: 800, color: "var(--t1)", marginBottom: "18px", letterSpacing: "-0.5px" }}>
            Schedule Post
          </p>

          {/* Mini calendar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "18px" }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} style={{ fontSize: "9px", fontWeight: 600, textAlign: "center", color: "var(--t3)" }}>{d}</div>
            ))}
            {calCells.map((c, i) => (
              <div
                key={i}
                onClick={() => c.cur && setSelectedDay(c.day)}
                style={{
                  width: "26px", height: "26px", borderRadius: "6px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", cursor: c.cur ? "pointer" : "default", transition: "all 0.15s",
                  background: c.cur && c.day === selectedDay ? "var(--gold)" : "transparent",
                  color: c.cur && c.day === selectedDay ? "#1a1000" : c.cur ? "var(--t2)" : "var(--t3)",
                  fontWeight: c.cur && c.day === selectedDay ? 700 : 400,
                  opacity: c.cur ? 1 : 0.4,
                }}
              >
                {c.day}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "6px", letterSpacing: "1.5px" }}>Time Selection</div>
              <input
                type="time"
                value={scheduledAt.slice(11, 16)}
                onChange={(e) => {
                  const [y, m, d] = scheduledAt.split("T")[0].split("-");
                  setScheduledAt(`${y}-${m}-${d}T${e.target.value}`);
                }}
                style={{ width: "120px", fontFamily: "var(--font-mono), monospace", fontSize: "13px" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "6px", letterSpacing: "1.5px" }}>Platform Sync</div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" }}>
                {["X", "LI", "TG"].map((p) => (
                  <div key={p} style={{ width: "24px", height: "24px", background: "var(--bg-mid)", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "8px", color: "var(--t3)", fontWeight: 700 }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Draft selector card */}
        <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--t3)", letterSpacing: "2px", marginBottom: "10px" }}>Selected Draft</div>

          <div
            onClick={() => { if (!pickerOpen && drafts.length === 0) loadDrafts(project?.id); setPickerOpen(!pickerOpen); }}
            style={{ background: "var(--bg-mid)", borderRadius: "8px", padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: "14px" }}
          >
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--t2)" }}>
              {selectedDraftId ? `Draft #${selectedDraftId}` : "Quarterly Analysis: Web3 Trends"}
            </span>
            <ChevronDown size={13} strokeWidth={2} style={{ color: "var(--t3)", transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </div>

          {pickerOpen && (
            <div style={{ background: "var(--bg-mid)", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", marginBottom: "14px" }}>
              {draftsLoading ? (
                <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}><Loader2 size={14} className="animate-spin" style={{ color: "var(--t3)" }} /></div>
              ) : drafts.length === 0 ? (
                <p style={{ padding: "14px 18px", fontSize: "12px", color: "var(--t3)" }}>No drafts — generate some first.</p>
              ) : drafts.map((draft) => (
                <button key={draft.id} onClick={() => selectDraft(draft)} style={{ width: "100%", textAlign: "left", padding: "11px 18px", display: "flex", flexDirection: "column", gap: "2px", background: selectedDraftId === draft.id ? "var(--bg-card2)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--t3)" }}>{draft.topic}</span>
                  <p style={{ fontSize: "12px", color: "var(--t2)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "280px" }}>{draft.text}</p>
                </button>
              ))}
            </div>
          )}

          <div style={{ background: "var(--bg-mid)", borderRadius: "8px", padding: "14px", marginBottom: "16px", fontStyle: "italic", fontSize: "12px", color: "var(--t2)", lineHeight: 1.6, flex: 1 }}>
            {text || '"The future of decentralized governance isn\'t just about code, it\'s about community sovereignty…"'}
            {text && (
              <span style={{ fontSize: "10px", color: "var(--gold)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontStyle: "normal" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
                Article Draft · {text.length} chars
              </span>
            )}
          </div>

          {selectedDraftId && (
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={toggleAutoQueue} disabled={togglingQueue} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--gold)" : "var(--t3)", display: "flex", alignItems: "center", gap: "6px", opacity: togglingQueue ? 0.4 : 1 }}>
                {autoQueue ? <ToggleRight size={16} strokeWidth={1.75} /> : <ToggleLeft size={16} strokeWidth={1.75} />}
                <span style={{ fontSize: "11px", color: autoQueue ? "var(--gold)" : "var(--t2)" }}>{autoQueue ? "In auto-queue" : "Auto-queue"}</span>
              </button>
            </div>
          )}

          <button
            onClick={schedule}
            disabled={loading || !text.trim() || !scheduledAt || text.length > 280}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "13px 26px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (loading || !text.trim() || !scheduledAt || text.length > 280) ? 0.45 : 1, fontFamily: "var(--font-manrope), sans-serif", width: "100%", boxShadow: "0 8px 22px rgba(255,184,0,0.18)" }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={12} style={{ color: "#1a1000" }} />}
            {loading ? "Scheduling…" : "Confirm Schedule"}
          </button>
          <p style={{ textAlign: "center", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--t3)", marginTop: "10px" }}>
            Authorized Execution Only
          </p>
        </div>
      </div>

      {/* Compose textarea */}
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Post Content</p>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: text.length > 280 ? "var(--red)" : "var(--t3)" }}>{text.length}/280</span>
        </div>
        <textarea value={text} onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }} rows={4} placeholder="Your post or select a draft above…" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "13.5px", color: "var(--t1)", lineHeight: 1.7, resize: "none", fontFamily: "var(--font-inter), sans-serif" }} />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px" }}>
          <button onClick={postNow} disabled={posting || !text.trim() || text.length > 280} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.14)", color: "var(--t1)", background: "transparent", cursor: "pointer", opacity: (posting || !text.trim() || text.length > 280) ? 0.45 : 1 }}>
            {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {posting ? "Posting…" : "Post now"}
          </button>
        </div>
      </div>

      {error   && <p style={{ fontSize: "12px", marginBottom: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>{error}</p>}
      {success && <p style={{ fontSize: "12px", marginBottom: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--green)" }}>{success}</p>}

      {/* ── The Chronology ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h2 style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "21px", fontWeight: 800, letterSpacing: "-0.4px", color: "var(--t1)" }}>The Chronology</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--t3)" }}>
            {scheduled.length} Posts Queued
          </span>
          <button onClick={() => loadPosts(project?.id)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--t3)", background: "none", border: "none", cursor: "pointer" }}>
            <RefreshCw size={12} strokeWidth={1.75} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: "12px", overflow: "hidden" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "125px 1fr 95px", gap: "14px", padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Execution Time</span>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Draft Preview</span>
          <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", textAlign: "right" }}>Action</span>
        </div>

        {posts.length === 0 ? (
          <p style={{ padding: "32px 20px", fontSize: "13px", textAlign: "center", color: "var(--t3)" }}>No scheduled posts.</p>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const s = STATUS_BADGE[post.status] ?? STATUS_BADGE.cancelled;
              return (
                <div key={post.id} style={{ display: "grid", gridTemplateColumns: "125px 1fr 95px", gap: "14px", padding: "16px 18px", borderBottom: idx < posts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                  {/* Date */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ width: "3px", height: "34px", background: post.status === "scheduled" ? "var(--gold)" : post.status === "posted" ? "var(--green)" : "var(--t3)", borderRadius: "2px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--t1)" }}>
                        {new Date(post.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {", "}
                        {new Date(post.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--t3)", marginTop: "2px" }}>
                        <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{s.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", background: "var(--bg-elev)", borderRadius: "7px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{post.text}</div>
                      <div style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>{post.platform}</div>
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ textAlign: "right" }}>
                    {post.status === "scheduled" && (
                      <button onClick={() => cancel(post.id)} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "5px 10px", marginLeft: "auto" }}>
                        <XIcon size={12} strokeWidth={1.75} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    <StatusBar />
    </>
  );
}
