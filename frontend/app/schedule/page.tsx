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
  scheduled:  { label: "Scheduled",  color: "var(--yellow)", bg: "var(--yellow-dim)", border: "rgba(234,179,8,0.25)"  },
  posted:     { label: "Posted",     color: "var(--green)",  bg: "var(--green-dim)",  border: "rgba(16,185,129,0.25)" },
  failed:     { label: "Failed",     color: "var(--red)",    bg: "var(--red-dim)",    border: "rgba(239,68,68,0.25)"  },
  cancelled:  { label: "Cancelled",  color: "var(--text-muted)", bg: "var(--surface-3)", border: "var(--border)"     },
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
      await api.scheduler.schedule(text, new Date(scheduledAt).toISOString(), "x");
      setSuccess("Scheduled."); setScheduledAt("");
      await loadPosts();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true); setError(""); setSuccess("");
    try {
      await api.content.postNow(text, "x");
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
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--blue-dim)", color: "var(--blue)" }}>05</span>
        <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Schedule</h2>
      </div>
      <p className="text-sm mb-8 ml-9" style={{ color: "var(--text-muted)" }}>
        Post immediately or pick a time. Manage your queue below.
      </p>

      {/* Compose card */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Post</label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
              rows={4}
              placeholder="Your post content."
              className="w-full px-4 py-3 text-sm rounded-lg resize-none"
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs font-mono" style={{ color: text.length > 280 ? "var(--red)" : "var(--text-muted)" }}>
                {text.length}/280
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Schedule for
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDatetime}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-lg"
            />
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={schedule}
            disabled={loading || !text.trim() || !scheduledAt || text.length > 280}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all disabled:opacity-40"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />}
            {loading ? "Scheduling..." : "Schedule"}
          </button>
          <button
            onClick={postNow}
            disabled={posting || !text.trim() || text.length > 280}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {posting ? "Posting..." : "Post now"}
          </button>
        </div>
      </div>

      {error   && <p className="text-xs mb-4 font-mono" style={{ color: "var(--red)"   }}>{error}</p>}
      {success && <p className="text-xs mb-4 font-mono" style={{ color: "var(--green)" }}>{success}</p>}

      {/* Queue */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <div className="flex items-center gap-2">
            <Clock size={13} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>Queue</p>
          </div>
          <button onClick={loadPosts} className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80" style={{ color: "var(--text-muted)" }}>
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>

        {posts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No scheduled posts.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {posts.map((post) => {
              const s = statusConfig[post.status] ?? statusConfig.cancelled;
              return (
                <div key={post.id} className="px-5 py-4">
                  <p className="text-sm mb-2.5 line-clamp-2" style={{ color: "var(--text)" }}>{post.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                        {s.label}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {new Date(post.scheduled_at).toLocaleString()}
                      </span>
                    </div>
                    {post.status === "scheduled" && (
                      <button onClick={() => cancel(post.id)} className="flex items-center gap-1 text-xs transition-colors hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                        <XIcon size={11} /> Cancel
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
