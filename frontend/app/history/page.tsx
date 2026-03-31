"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Post {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string | null;
  posted_at: string | null;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scheduled: { label: "Scheduled", color: "var(--yellow)",     bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  posted:    { label: "Posted",    color: "var(--green)",      bg: "var(--green-dim)",  border: "var(--green-border)"  },
  failed:    { label: "Failed",    color: "var(--red)",        bg: "var(--red-dim)",    border: "var(--red-border)"    },
  cancelled: { label: "Cancelled", color: "var(--text-muted)", bg: "var(--surface-3)",  border: "var(--border-2)"      },
  draft:     { label: "Draft",     color: "var(--text-dim)",   bg: "var(--surface-2)",  border: "var(--border-2)"      },
};

export default function HistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.scheduler.list() as { posts: Post[] };
        setPosts(res.posts);
      } catch { /* backend not running */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-4xl">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-[20px] font-semibold tracking-tight mb-1" style={{ color: "var(--text)" }}>History</h2>
        <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>All scheduled and posted content.</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Table header */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: "1fr 120px 120px 160px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          {["Post", "Platform", "Status", "Date"].map((col) => (
            <span key={col} className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              {col}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : posts.length === 0 ? (
          <p className="px-5 py-10 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>
            No posts yet.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {posts.map((post) => {
              const s = statusConfig[post.status] ?? statusConfig.draft;
              const date = post.posted_at ?? post.scheduled_at;
              return (
                <div
                  key={post.id}
                  className="grid items-center px-5 py-4"
                  style={{ gridTemplateColumns: "1fr 120px 120px 160px" }}
                >
                  <p className="pr-6 line-clamp-2 text-[13px]" style={{ color: "var(--text)" }}>{post.text}</p>
                  <span className="text-[12px] font-mono uppercase" style={{ color: "var(--text-muted)" }}>
                    {post.platform}
                  </span>
                  <span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded font-medium"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {date ? new Date(date).toLocaleString() : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
