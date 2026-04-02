"use client";

import { useState, useEffect } from "react";
import { api, AnalyticsRow } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Eye, Heart } from "lucide-react";

interface Post {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string | null;
  posted_at: string | null;
  status: string;
  tweet_id?: string | null;
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
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, AnalyticsRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const project = store.getProject();
        const [postsRes, analyticsRes] = await Promise.all([
          api.scheduler.list(project?.id) as Promise<{ posts: Post[] }>,
          api.analytics.posts(project?.id).catch(() => ({ analytics: [] })),
        ]);
        setPosts(postsRes.posts);
        const map: Record<string, AnalyticsRow> = {};
        for (const row of analyticsRes.analytics) {
          if (row.tweet_id) map[row.tweet_id] = row;
        }
        setAnalyticsMap(map);
      } catch { /* backend not running */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div style={{ padding: "52px 64px", maxWidth: "1100px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "8px", color: "var(--text)" }}>History</h2>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.5 }}>All scheduled and posted content.</p>
      </div>

      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 110px 160px 130px",
          padding: "14px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}>
          {["Post", "Platform", "Status", "Date", "Analytics"].map((col) => (
            <span key={col} style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              {col}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : posts.length === 0 ? (
          <p style={{ padding: "48px 24px", fontSize: "14px", textAlign: "center", color: "var(--text-muted)" }}>
            No posts yet.
          </p>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const s = statusConfig[post.status] ?? statusConfig.draft;
              const date = post.posted_at ?? post.scheduled_at;
              const analytics = post.tweet_id ? analyticsMap[post.tweet_id] : null;

              return (
                <div
                  key={post.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 110px 160px 130px",
                    alignItems: "center",
                    padding: "18px 24px",
                    borderBottom: idx < posts.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <p style={{ paddingRight: "24px", fontSize: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--text)" }}>
                    {post.text}
                  </p>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    {post.platform}
                  </span>
                  <span>
                    <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", fontWeight: 500, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                      {s.label}
                    </span>
                  </span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {date ? new Date(date).toLocaleString() : "—"}
                  </span>
                  {/* Analytics column */}
                  {analytics ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <Eye size={11} style={{ color: "var(--text-subtle)" }} />
                        {analytics.impressions.toLocaleString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                        <Heart size={11} style={{ color: "var(--text-subtle)" }} />
                        {analytics.likes.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
                      {post.status === "posted" ? "—" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
