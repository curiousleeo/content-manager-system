"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

interface ScheduledPost {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string;
  status: "scheduled" | "posted" | "failed" | "cancelled";
  posted_at?: string;
  error?: string;
}

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
    } catch {
      // backend may not be running yet
    }
  }

  async function schedule() {
    if (!text.trim() || !scheduledAt) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.scheduler.schedule(text, new Date(scheduledAt).toISOString(), "x");
      setSuccess("Scheduled.");
      setScheduledAt("");
      await loadPosts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    setSuccess("");
    try {
      await api.content.postNow(text, "x");
      setSuccess("Posted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function cancel(id: string) {
    try {
      await api.scheduler.cancel(id);
      await loadPosts();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const statusColor: Record<string, string> = {
    scheduled: "text-zinc-400",
    posted: "text-green-400",
    failed: "text-red-400",
    cancelled: "text-zinc-600",
  };

  // Min datetime = now (local)
  const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">05 — Schedule</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Post immediately or pick a time. Manage your queue below.
      </p>

      {/* Post text */}
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Post
        </label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            store.setContent(e.target.value);
          }}
          rows={5}
          placeholder="Your post content."
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
        <div className="flex justify-end">
          <span className={`text-xs font-mono ${text.length > 280 ? "text-red-400" : "text-zinc-600"}`}>
            {text.length}/280
          </span>
        </div>
      </div>

      {/* Schedule datetime */}
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Schedule for
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          min={minDatetime}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4 font-mono">{error}</p>}
      {success && <p className="text-green-400 text-sm mb-4 font-mono">{success}</p>}

      <div className="flex gap-3 mb-10">
        <button
          onClick={schedule}
          disabled={loading || !text.trim() || !scheduledAt || text.length > 280}
          className="px-5 py-2.5 border border-zinc-600 text-sm rounded hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Scheduling..." : "Schedule"}
        </button>
        <button
          onClick={postNow}
          disabled={posting || !text.trim() || text.length > 280}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {posting ? "Posting..." : "Post now"}
        </button>
      </div>

      {/* Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-wide">Queue</p>
          <button
            onClick={loadPosts}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Refresh
          </button>
        </div>

        {posts.length === 0 ? (
          <p className="text-zinc-600 text-sm">No scheduled posts.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-zinc-900 border border-zinc-800 rounded p-4"
              >
                <p className="text-sm text-zinc-200 mb-2 line-clamp-2">{post.text}</p>
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex gap-4 text-zinc-500">
                    <span>{new Date(post.scheduled_at).toLocaleString()}</span>
                    <span className={statusColor[post.status]}>{post.status}</span>
                  </div>
                  {post.status === "scheduled" && (
                    <button
                      onClick={() => cancel(post.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
