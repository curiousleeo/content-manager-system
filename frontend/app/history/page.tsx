"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Post {
  id: string;
  text: string;
  platform: string;
  scheduled_at: string | null;
  posted_at: string | null;
  status: string;
}

const statusColor: Record<string, string> = {
  scheduled: "text-yellow-400",
  posted: "text-green-400",
  failed: "text-red-400",
  cancelled: "text-zinc-600",
  draft: "text-zinc-400",
};

export default function HistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.scheduler.list() as { posts: Post[] };
        setPosts(res.posts);
      } catch {
        // backend not running
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-1">History</h2>
      <p className="text-zinc-400 text-sm mb-8">All scheduled and posted content.</p>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-zinc-600 text-sm">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-900 border border-zinc-800 rounded p-4"
            >
              <p className="text-sm text-zinc-200 mb-3">{post.text}</p>
              <div className="flex gap-6 text-xs font-mono text-zinc-500">
                <span className={statusColor[post.status]}>{post.status}</span>
                {post.scheduled_at && (
                  <span>scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
                )}
                {post.posted_at && (
                  <span>posted: {new Date(post.posted_at).toLocaleString()}</span>
                )}
                <span className="text-zinc-600">{post.platform}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
