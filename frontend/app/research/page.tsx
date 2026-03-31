"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Search, ArrowRight, Loader2 } from "lucide-react";

const SOURCES = ["x", "reddit", "youtube", "google_trends"];
const SOURCE_LABELS: Record<string, string> = {
  x: "X (Twitter)", reddit: "Reddit", youtube: "YouTube", google_trends: "Google Trends",
};

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["x", "youtube"]);
  const [subreddits, setSubreddits] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [pillars, setPillars] = useState<string[]>([]);

  useEffect(() => {
    const p = store.getProject();
    if (p?.content_pillars?.length) setPillars(p.content_pillars);
    if (p?.default_subreddits?.length) setSubreddits(p.default_subreddits.join(", "));
  }, []);

  function toggleSource(s: string) {
    setSources((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
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
    <div className="p-8 max-w-3xl">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>01</span>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>Research</h2>
        </div>
        <p className="text-[13px] ml-6" style={{ color: "var(--text-muted)" }}>
          Search across sources to find what people are talking about.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-5 flex flex-col gap-5">
          {/* Content pillars */}
          {pillars.length > 0 && (
            <div>
              <p className="text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                Content pillars
              </p>
              <div className="flex gap-2 flex-wrap">
                {pillars.map((pillar) => (
                  <button
                    key={pillar}
                    onClick={() => run(pillar)}
                    className="px-3 py-1.5 rounded-md text-[12px] transition-colors"
                    style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
                  >
                    {pillar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query */}
          <div>
            <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              Topic or keyword
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  placeholder="e.g. crypto perps, self-custody trading"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg"
                />
              </div>
              <button
                onClick={() => run()}
                disabled={loading || !query.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Sources */}
          <div>
            <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              Sources
            </label>
            <div className="flex gap-2 flex-wrap">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  className="px-3 py-1.5 rounded-md text-[12px] font-mono transition-all"
                  style={{
                    background: sources.includes(s) ? "var(--accent-dim)" : "var(--surface-3)",
                    border: `1px solid ${sources.includes(s) ? "var(--accent-border)" : "var(--border-2)"}`,
                    color: sources.includes(s) ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Reddit subreddits */}
          {sources.includes("reddit") && (
            <div>
              <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                Subreddits (comma-separated)
              </label>
              <input
                type="text"
                value={subreddits}
                onChange={(e) => setSubreddits(e.target.value)}
                placeholder="e.g. CryptoCurrency, trading, DeFi"
                className="w-full px-4 py-2.5 rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-[12px] mt-4 font-mono" style={{ color: "var(--red)" }}>{error}</p>}

      {/* Results */}
      {results && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px]" style={{ color: "var(--text-dim)" }}>
              Results for{" "}
              <span style={{ color: "var(--text)" }} className="font-medium">
                {(results as { query?: string }).query}
              </span>
            </p>
            <button
              onClick={() => router.push("/insights")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-medium transition-all"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Analyze insights <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => (
              <div key={source} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="px-4 py-2.5 flex items-center" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-dim)" }}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                </div>
                {Array.isArray(items) && items.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {(items as Record<string, unknown>[]).slice(0, 5).map((item, i) => (
                      <div key={i} className="px-4 py-3 text-[13px]" style={{ color: "var(--text-dim)" }}>
                        {source === "x" && <p>{String(item.text ?? "")}</p>}
                        {source === "reddit" && (
                          <div>
                            <p className="font-medium mb-0.5" style={{ color: "var(--text)" }}>{String(item.title ?? "")}</p>
                            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>r/{String(item.subreddit ?? "")} · {Number(item.score ?? 0)} pts</p>
                          </div>
                        )}
                        {source === "youtube" && (
                          <div>
                            <p className="font-medium mb-0.5" style={{ color: "var(--text)" }}>{String(item.title ?? "")}</p>
                            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{String(item.channel ?? "")}</p>
                          </div>
                        )}
                        {source === "google_trends" && <p>{String(item)}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-[13px]" style={{ color: "var(--text-muted)" }}>No results</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
