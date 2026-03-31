"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

const SOURCES = ["x", "reddit", "youtube", "google_trends"];

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["x", "youtube"]);
  const [subreddits, setSubreddits] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [project, setProject] = useState(store.getProject());
  const [pillars, setPillars] = useState<string[]>([]);

  useEffect(() => {
    const p = store.getProject();
    setProject(p);
    if (p?.content_pillars?.length) setPillars(p.content_pillars);
    if (p?.default_subreddits?.length) setSubreddits(p.default_subreddits.join(", "));
  }, []);

  function toggleSource(s: string) {
    setSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function run(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    if (q) setQuery(q);
    try {
      const subs = subreddits.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await api.research.run(searchQuery, sources, subs) as Record<string, unknown>;
      setResults(data);
      store.setResearch(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-xl font-semibold">01 — Research</h2>
        {project && (
          <span className="text-xs font-mono text-zinc-500 border border-zinc-800 rounded px-2 py-1">
            {project.name}
          </span>
        )}
      </div>
      <p className="text-zinc-500 text-sm mb-8">Search across sources to find what people are talking about.</p>

      {/* Content pillars shortcut */}
      {pillars.length > 0 && (
        <div className="mb-5">
          <p className="text-xs text-zinc-600 font-mono uppercase tracking-wide mb-2">Content pillars</p>
          <div className="flex gap-2 flex-wrap">
            {pillars.map((pillar) => (
              <button
                key={pillar}
                onClick={() => run(pillar)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
              >
                {pillar}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query */}
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Topic or keyword
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. crypto perps, self-custody trading"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={() => run()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Sources */}
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">Sources</label>
        <div className="flex gap-3 flex-wrap">
          {SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={`px-3 py-1.5 rounded border text-sm font-mono transition-colors ${
                sources.includes(s)
                  ? "border-zinc-400 text-zinc-100 bg-zinc-800"
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
              }`}
            >
              {s === "google_trends" ? "Google Trends" : s === "x" ? "X (Twitter)" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {sources.includes("reddit") && (
        <div className="mb-8">
          <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
            Subreddits (comma-separated)
          </label>
          <input
            type="text"
            value={subreddits}
            onChange={(e) => setSubreddits(e.target.value)}
            placeholder="e.g. CryptoCurrency, trading, DeFi"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-6 font-mono">{error}</p>}

      {results && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-400">
              Results for <span className="text-zinc-200 font-medium">{(results as { query?: string }).query}</span>
            </p>
            <button
              onClick={() => router.push("/insights")}
              className="text-sm px-4 py-2 border border-zinc-600 rounded hover:bg-zinc-800 transition-colors"
            >
              Analyze insights →
            </button>
          </div>
          {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => (
            <div key={source} className="mb-6">
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-2">
                {source === "x" ? "X (Twitter)" : source === "google_trends" ? "Google Trends" : source}
              </p>
              {Array.isArray(items) && items.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {(items as Record<string, unknown>[]).slice(0, 5).map((item, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-zinc-300">
                      {source === "x" && <p>{String(item.text ?? "")}</p>}
                      {source === "reddit" && (
                        <div>
                          <p className="font-medium text-zinc-200">{String(item.title ?? "")}</p>
                          <p className="text-zinc-500 text-xs mt-1">r/{String(item.subreddit ?? "")} · {Number(item.score ?? 0)} pts</p>
                        </div>
                      )}
                      {source === "youtube" && (
                        <div>
                          <p className="font-medium text-zinc-200">{String(item.title ?? "")}</p>
                          <p className="text-zinc-500 text-xs mt-1">{String(item.channel ?? "")}</p>
                        </div>
                      )}
                      {source === "google_trends" && <p>{String(item)}</p>}
                      {typeof item === "object" && item !== null && (item as Record<string, unknown>).error ? (
                        <p className="text-red-400 text-xs">{String((item as Record<string, unknown>).error)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No results</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
