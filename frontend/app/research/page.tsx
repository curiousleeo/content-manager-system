"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Search, ArrowRight, Loader2 } from "lucide-react";

const SOURCES = ["grok", "reddit", "youtube", "google_trends"];
const SOURCE_LABELS: Record<string, string> = {
  grok: "Grok (X data)", reddit: "Reddit", youtube: "YouTube", google_trends: "Google Trends",
};

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["grok", "google_trends"]);
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
    <div style={{ padding: "52px 64px", maxWidth: "860px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>01</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Research</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Search across sources to find what people are talking about.
        </p>
      </div>

      {/* Card */}
      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Content pillars */}
          {pillars.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Content pillars
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {pillars.map((pillar) => (
                  <button
                    key={pillar}
                    onClick={() => run(pillar)}
                    style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-dim)"; }}
                  >
                    {pillar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Topic or keyword
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  placeholder="e.g. crypto perps, self-custody trading"
                  style={{ width: "100%", paddingLeft: "42px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>
              <button
                onClick={() => run()}
                disabled={loading || !query.trim()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (loading || !query.trim()) ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Sources */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Sources
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
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
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Subreddits (comma-separated)
              </label>
              <input
                type="text"
                value={subreddits}
                onChange={(e) => setSubreddits(e.target.value)}
                placeholder="e.g. CryptoCurrency, trading, DeFi"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", fontSize: "14px" }}
              />
            </div>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}

      {/* Results */}
      {results && (
        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Results for{" "}
              <strong style={{ color: "var(--text)", fontWeight: 500 }}>
                {(results as { query?: string }).query}
              </strong>
            </p>
            <button
              onClick={() => router.push("/insights")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Analyze insights <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => (
              <div key={source} style={{ borderRadius: "12px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                </div>
                {Array.isArray(items) && items.length > 0 ? (
                  <div>
                    {(items as Record<string, unknown>[]).slice(0, 5).map((item, i) => (
                      <div key={i} style={{ padding: "14px 20px", fontSize: "14px", color: "var(--text-dim)", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                        {source === "grok" && (
                          <div>
                            <p style={{ marginBottom: "6px", color: "var(--text)" }}>{String(item.text ?? "")}</p>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {item.angle && (
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "5px", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent-light)" }}>
                                  → {String(item.angle)}
                                </span>
                              )}
                              {item.sentiment && (
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "5px", fontFamily: "monospace", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-muted)" }}>
                                  {String(item.sentiment)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {source === "x" && <p>{String(item.text ?? "")}</p>}
                        {source === "reddit" && (
                          <div>
                            <p style={{ fontWeight: 500, marginBottom: "4px", color: "var(--text)" }}>{String(item.title ?? "")}</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>r/{String(item.subreddit ?? "")} · {Number(item.score ?? 0)} pts</p>
                          </div>
                        )}
                        {source === "youtube" && (
                          <div>
                            <p style={{ fontWeight: 500, marginBottom: "4px", color: "var(--text)" }}>{String(item.title ?? "")}</p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{String(item.channel ?? "")}</p>
                          </div>
                        )}
                        {source === "google_trends" && <p>{String(item)}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ padding: "16px 20px", fontSize: "14px", color: "var(--text-muted)" }}>No results</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
