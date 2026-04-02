"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Send, Clock, RefreshCw, X as XIcon, Loader2, CalendarClock } from "lucide-react";

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

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const res = await api.scheduler.list() as { posts: ScheduledPost[] };
      setPosts(res.posts);
    } catch { /* backend may not be running */ }
  }

  async function schedule() {
    if (!text.trim() || !scheduledAt) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      const project = store.getProject();
      await api.scheduler.schedule(text, new Date(scheduledAt).toISOString(), "x", project?.id);
      setSuccess("Scheduled."); setScheduledAt("");
      await loadPosts();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true); setError(""); setSuccess("");
    try {
      const project = store.getProject();
      await api.content.postNow(text, "x", project?.id);
      setSuccess("Posted.");
    } catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  }

  async function cancel(id: string) {
    try { await api.scheduler.cancel(id); await loadPosts(); }
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

      {/* Compose card */}
      <div style={{ borderRadius: "14px", overflow: "hidden", marginBottom: "28px", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Post</label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
              rows={5}
              placeholder="Your post content."
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
          <button onClick={loadPosts} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
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
