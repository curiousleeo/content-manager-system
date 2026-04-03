"use client";

import { useState, useEffect } from "react";
import { api, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Send, Clock, RefreshCw, X as XIcon, Loader2, CalendarClock, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";

interface ScheduledPost {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string;
  status: "scheduled" | "posted" | "failed" | "cancelled";
  posted_at?: string;
  error?: string;
}

const statusConfig = {
  scheduled:  { label: "Scheduled",  color: "var(--yellow)",     bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  posted:     { label: "Posted",     color: "var(--green)",      bg: "var(--green-dim)",  border: "var(--green-border)"  },
  failed:     { label: "Failed",     color: "var(--red)",        bg: "var(--red-dim)",    border: "var(--red-border)"    },
  cancelled:  { label: "Cancelled",  color: "var(--text-muted)", bg: "var(--surface-3)",  border: "var(--border-2)"      },
};

export default function SchedulePage() {
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Draft picker state
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [autoQueue, setAutoQueue] = useState(false);
  const [togglingQueue, setTogglingQueue] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    const saved = store.getContent();
    if (saved) {
      setText(saved);
    } else {
      setPickerOpen(true);
      loadDrafts(proj?.id);
    }
    loadPosts(proj?.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDrafts(projectId?: number) {
    setDraftsLoading(true);
    try {
      const res = await api.content.drafts(projectId);
      setDrafts(res.drafts);
    } catch { /* ignore */ }
    finally { setDraftsLoading(false); }
  }

  function selectDraft(draft: Draft) {
    setText(draft.text);
    store.setContent(draft.text);
    setSelectedDraftId(draft.id);
    setAutoQueue(draft.auto_queue);
    setPickerOpen(false);
  }

  async function toggleAutoQueue() {
    if (!selectedDraftId) return;
    setTogglingQueue(true);
    try {
      const updated = await api.content.setAutoQueue(selectedDraftId, !autoQueue);
      setAutoQueue(updated.auto_queue);
      setDrafts((prev) => prev.map((d) => d.id === selectedDraftId ? { ...d, auto_queue: updated.auto_queue } : d));
    } catch { /* ignore */ }
    finally { setTogglingQueue(false); }
  }

  async function loadPosts(projectId?: number) {
    try {
      const res = await api.scheduler.list(projectId) as { posts: ScheduledPost[] };
      setPosts(res.posts);
    } catch { /* backend may not be running */ }
  }

  async function schedule() {
    if (!text.trim() || !scheduledAt) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.scheduler.schedule(text, new Date(scheduledAt).toISOString(), "x", project?.id);
      setSuccess("Scheduled."); setScheduledAt("");
      await loadPosts(project?.id);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true); setError(""); setSuccess("");
    try {
      await api.content.postNow(text, "x", project?.id);
      setSuccess("Posted.");
    } catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  }

  async function cancel(id: string) {
    try { await api.scheduler.cancel(id); await loadPosts(project?.id); }
    catch (e) { setError((e as Error).message); }
  }

  const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div style={{ padding: "52px 64px", maxWidth: "760px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>05</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Schedule</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Post immediately or pick a time. Manage your queue below.
        </p>
      </div>

      {/* Draft picker */}
      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <button
          onClick={() => {
            if (!pickerOpen && drafts.length === 0) loadDrafts(project?.id);
            setPickerOpen(!pickerOpen);
          }}
          style={{ width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "13px" }}
        >
          <span style={{ fontWeight: 500 }}>
            {selectedDraftId ? `Draft selected #${selectedDraftId}` : "Pick from drafts"}
          </span>
          <ChevronDown size={14} style={{ transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {pickerOpen && (
          <div style={{ borderTop: "1px solid var(--border)", maxHeight: "320px", overflowY: "auto" }}>
            {draftsLoading ? (
              <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
                <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : drafts.length === 0 ? (
              <div style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No drafts found. Generate some in the Generate page.</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => selectDraft(draft)}
                  style={{
                    width: "100%", textAlign: "left", padding: "14px 20px", display: "flex", flexDirection: "column", gap: "4px",
                    background: selectedDraftId === draft.id ? "var(--surface-2)" : "transparent",
                    border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-subtle)" }}>{draft.topic}</span>
                    {draft.auto_queue && <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>queued</span>}
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "600px" }}>
                    {draft.text}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Compose card */}
      <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "28px", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Post</label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
              rows={5}
              placeholder="Your post content, or pick a draft above."
              style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", resize: "none", fontSize: "14px", lineHeight: 1.7 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: text.length > 280 ? "var(--red)" : "var(--text-muted)" }}>
                {text.length}/280
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Schedule for
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDatetime}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{ padding: "12px 16px", borderRadius: "10px", fontSize: "14px" }}
            />
          </div>

          {/* Auto-queue toggle — only when a draft is selected */}
          {selectedDraftId && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={toggleAutoQueue}
                disabled={togglingQueue}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--accent)" : "var(--text-muted)", opacity: togglingQueue ? 0.4 : 1, display: "flex", alignItems: "center" }}
              >
                {autoQueue ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
              <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>
                {autoQueue ? "In auto-queue" : "Add to auto-queue"}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 28px", display: "flex", gap: "10px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={schedule}
            disabled={loading || !text.trim() || !scheduledAt || text.length > 280}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: (loading || !text.trim() || !scheduledAt || text.length > 280) ? 0.4 : 1, transition: "opacity 0.15s" }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
            {loading ? "Scheduling..." : "Schedule"}
          </button>
          <button
            onClick={postNow}
            disabled={posting || !text.trim() || text.length > 280}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (posting || !text.trim() || text.length > 280) ? 0.4 : 1, transition: "opacity 0.15s" }}
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {posting ? "Posting..." : "Post now"}
          </button>
        </div>
      </div>

      {error   && <p style={{ fontSize: "13px", marginBottom: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}
      {success && <p style={{ fontSize: "13px", marginBottom: "16px", fontFamily: "monospace", color: "var(--green)" }}>{success}</p>}

      {/* Queue */}
      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>Queue</p>
          </div>
          <button onClick={() => loadPosts(project?.id)} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {posts.length === 0 ? (
          <p style={{ padding: "32px 24px", fontSize: "14px", textAlign: "center", color: "var(--text-muted)" }}>No scheduled posts.</p>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const s = statusConfig[post.status] ?? statusConfig.cancelled;
              return (
                <div key={post.id} style={{ padding: "18px 24px", borderBottom: idx < posts.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <p style={{ fontSize: "14px", marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--text)" }}>{post.text}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", fontWeight: 500, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                        {new Date(post.scheduled_at).toLocaleString()}
                      </span>
                    </div>
                    {post.status === "scheduled" && (
                      <button onClick={() => cancel(post.id)} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                        <XIcon size={12} /> Cancel
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
  );
}
