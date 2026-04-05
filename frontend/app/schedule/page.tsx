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

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    const saved = store.getContent();
    if (saved) { setText(saved); }
    else { setPickerOpen(true); loadDrafts(proj?.id); setFromDB(true); }
    loadPosts(proj?.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setSuccess("Scheduled."); setScheduledAt(""); await loadPosts(project?.id);
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

  const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
  const scheduled   = posts.filter((p) => p.status === "scheduled");

  return (
    <>
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
          PUBLISH QUEUE
        </p>
        <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1 }}>
          Schedule
        </h1>
      </div>

      {fromDB && (
        <div style={{ padding: "10px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)", fontSize: "12px", color: "var(--blue)" }}>
          Loaded from DB — pick a draft below. Start pipeline from Research to use fresh data.
        </div>
      )}

      {/* ── Top two cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>

        {/* Date picker card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Calendar size={14} strokeWidth={1.75} style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Schedule Time</p>
          </div>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minDatetime}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{ width: "100%", fontSize: "13px", marginBottom: "14px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={schedule}
              disabled={loading || !text.trim() || !scheduledAt || text.length > 280}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (loading || !text.trim() || !scheduledAt || text.length > 280) ? 0.45 : 1, fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
              {loading ? "Scheduling…" : "Schedule"}
            </button>
            <button
              onClick={postNow}
              disabled={posting || !text.trim() || text.length > 280}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "10px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.14)", color: "var(--t1)", background: "transparent", cursor: "pointer", opacity: (posting || !text.trim() || text.length > 280) ? 0.45 : 1 }}
            >
              {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {posting ? "Posting…" : "Post now"}
            </button>
          </div>
        </div>

        {/* Artifact selector card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <button
            onClick={() => { if (!pickerOpen && drafts.length === 0) loadDrafts(project?.id); setPickerOpen(!pickerOpen); }}
            style={{ width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
          >
            <div>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "4px" }}>Draft Selector</p>
              <p style={{ fontSize: "12.5px", color: "var(--t2)" }}>{selectedDraftId ? `Draft #${selectedDraftId} selected` : "Pick a draft to schedule"}</p>
            </div>
            <ChevronDown size={14} strokeWidth={1.75} style={{ color: "var(--t3)", transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {pickerOpen && (
            <div style={{ borderTop: "1px solid var(--border)", maxHeight: "240px", overflowY: "auto" }}>
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
          {selectedDraftId && (
            <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={toggleAutoQueue} disabled={togglingQueue} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--gold)" : "var(--t3)", display: "flex", alignItems: "center", gap: "6px", opacity: togglingQueue ? 0.4 : 1 }}>
                {autoQueue ? <ToggleRight size={16} strokeWidth={1.75} /> : <ToggleLeft size={16} strokeWidth={1.75} />}
                <span style={{ fontSize: "11px", color: autoQueue ? "var(--gold)" : "var(--t2)" }}>{autoQueue ? "In auto-queue" : "Auto-queue"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose textarea */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Post Content</p>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: text.length > 280 ? "var(--red)" : "var(--t3)" }}>{text.length}/280</span>
        </div>
        <textarea value={text} onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }} rows={4} placeholder="Your post or select a draft above…" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "13.5px", color: "var(--t1)", lineHeight: 1.7, resize: "none", fontFamily: "var(--font-inter), sans-serif" }} />
      </div>

      {error   && <p style={{ fontSize: "12px", marginBottom: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>{error}</p>}
      {success && <p style={{ fontSize: "12px", marginBottom: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--green)" }}>{success}</p>}

      {/* ── Queue list ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Queue</p>
            {scheduled.length > 0 && (
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,184,0,0.08)", color: "var(--gold)", fontWeight: 600 }}>{scheduled.length} scheduled</span>
            )}
          </div>
          <button onClick={() => loadPosts(project?.id)} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--t3)", background: "none", border: "none", cursor: "pointer" }}>
            <RefreshCw size={12} strokeWidth={1.75} /> Refresh
          </button>
        </div>

        {posts.length === 0 ? (
          <p style={{ padding: "32px 20px", fontSize: "13px", textAlign: "center", color: "var(--t3)" }}>No scheduled posts.</p>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const s = STATUS_BADGE[post.status] ?? STATUS_BADGE.cancelled;
              return (
                <div key={post.id} style={{ display: "flex", gap: "0", borderBottom: idx < posts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  {/* Gold left bar */}
                  <div style={{ width: "3px", background: post.status === "scheduled" ? "var(--gold)" : post.status === "posted" ? "var(--green)" : "var(--t3)", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px 20px" }}>
                    <p style={{ fontSize: "13px", color: "var(--t1)", lineHeight: 1.55, marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.text}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, letterSpacing: "0.5px", background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{s.label}</span>
                        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>{new Date(post.scheduled_at).toLocaleString()}</span>
                      </div>
                      {post.status === "scheduled" && (
                        <button onClick={() => cancel(post.id)} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", background: "none", border: "none", cursor: "pointer" }}>
                          <XIcon size={12} strokeWidth={1.75} /> Cancel
                        </button>
                      )}
                    </div>
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
