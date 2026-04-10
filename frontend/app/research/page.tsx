"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Search, Zap, Loader2, Check, ArrowRight, Lightbulb } from "lucide-react";

const SOURCES = [
  { key: "competitor_topics", label: "Competitor Topics", accentColor: "var(--green)",    accentDim: "rgba(34,197,94,0.10)",    accentBorder: "rgba(34,197,94,0.25)",   always: true  },
  { key: "google_trends",     label: "Google Trends",     accentColor: "var(--gold)",     accentDim: "rgba(255,184,0,0.10)",    accentBorder: "rgba(255,184,0,0.25)",   always: true  },
  { key: "coingecko",         label: "CoinGecko",         accentColor: "var(--purple-l)", accentDim: "rgba(107,47,217,0.10)",   accentBorder: "rgba(107,47,217,0.25)",  always: false },
  { key: "telegram",          label: "Telegram",          accentColor: "var(--blue)",     accentDim: "rgba(29,161,242,0.08)",   accentBorder: "rgba(29,161,242,0.20)",  always: false },
  { key: "grok_manual",       label: "Grok Manual",       accentColor: "var(--t2)",       accentDim: "rgba(255,255,255,0.05)",  accentBorder: "rgba(255,255,255,0.12)", always: true  },
];

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [sources, setSources]   = useState<string[]>(["competitor_topics"]);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<Record<string, unknown> | null>(null);
  const [error, setError]       = useState("");
  const [pillars, setPillars]   = useState<string[]>([]);
  const [coingeckoEnabled, setCoingeckoEnabled] = useState(false);

  const [pasteText, setPasteText]   = useState("");
  const [pasteQuery, setPasteQuery] = useState("");
  const [pasting, setPasting]       = useState(false);
  const [pasteSaved, setPasteSaved] = useState(false);

  useEffect(() => {
    const p = store.getProject();
    if (p?.content_pillars?.length) setPillars(p.content_pillars);
    if (p?.coingecko_enabled) setCoingeckoEnabled(true);
  }, []);

  function toggleSource(s: string) {
    setSources((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function run(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true); setError("");
    if (q) setQuery(q);
    try {
      const project = store.getProject();
      const data = await api.research.run(searchQuery, sources, project?.id);
      setResults(data);
      store.setResearch(data, (data as { research_id?: number }).research_id);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function savePane() {
    if (!pasteText.trim()) return;
    setPasting(true); setError("");
    try {
      const project = store.getProject();
      const label = pasteQuery.trim() || "manual research";
      const res = await api.research.paste(pasteText, label, project?.id);
      store.setResearch({ query: label, data: { grok_manual: pasteText }, research_id: res.research_id }, res.research_id);
      setPasteSaved(true);
      setTimeout(() => setPasteSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setPasting(false); }
  }

  const availableSources = SOURCES.filter((s) =>
    s.always || (s.key === "coingecko" && coingeckoEnabled)
  );

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
          SOVEREIGN INTEL
        </p>
        <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1, margin: "0 0 8px" }}>
          Sovereign Intel
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t2)", lineHeight: 1.65, maxWidth: "540px", margin: 0 }}>
          Cross-reference real-time trends and manual intelligence to fuel your automation engine.
        </p>
      </div>

      {/* ── Source chips ── */}
      <div style={{ marginBottom: "18px" }}>
        <p style={{ fontSize: "9px", color: "var(--t3)", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: "10px" }}>
          Primary Sources
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {availableSources.map((s) => {
            const on = sources.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSource(s.key)}
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "5px 13px", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.7px", textTransform: "uppercase",
                  cursor: "pointer", transition: "all .15s",
                  border: `1px solid ${on ? s.accentBorder : "rgba(255,255,255,.1)"}`,
                  background: on ? s.accentDim : "transparent",
                  color: on ? s.accentColor : "var(--t2)",
                }}
              >
                {s.label}
              </button>
            );
          })}
          {!coingeckoEnabled && (
            <span style={{ fontSize: "11px", color: "var(--t3)", alignSelf: "center", marginLeft: "4px" }}>
              CoinGecko — enable in project settings
            </span>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-mid)", borderRadius: "12px", padding: "9px", marginBottom: "32px" }}>
        <Search size={16} strokeWidth={1.75} style={{ color: "var(--t3)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search topic, keyword, narrative…"
          style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "var(--t1)", outline: "none", padding: "0" }}
        />
        {pillars.length > 0 && (
          <div style={{ display: "flex", gap: "6px", padding: "0 6px", borderLeft: "1px solid var(--border)" }}>
            {pillars.slice(0, 3).map((p) => (
              <button key={p} onClick={() => run(p)} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px", background: "rgba(255,184,0,0.07)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--gold)", cursor: "pointer", whiteSpace: "nowrap" }}>
                {p}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => run()}
          disabled={loading || !query.trim()}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 18px", borderRadius: "8px",
            background: "var(--gold)", color: "#1a1000",
            fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "12px",
            border: "none", cursor: "pointer",
            opacity: (loading || !query.trim()) ? 0.5 : 1,
            letterSpacing: "0.5px", transition: "opacity 0.15s", whiteSpace: "nowrap",
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} strokeWidth={2} />}
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: "12px", marginBottom: "16px", fontFamily: "var(--font-mono), monospace", color: "var(--red)", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}

      {/* ── Two-column main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: "20px" }}>

        {/* Left — Grok paste + tip */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Grok paste card */}
          <div style={{ background: "var(--bg-card)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: "var(--gold)", margin: 0 }}>
                Grok / Manual Paste
              </p>
              <span style={{ fontSize: "10px", color: "var(--t3)" }}>Last updated: 2m ago</span>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ background: "var(--bg-card)", border: "none", overflow: "hidden" }}>
                <input
                  type="text"
                  value={pasteQuery}
                  onChange={(e) => setPasteQuery(e.target.value)}
                  placeholder='Label (e.g. "Grok — BTC perps Apr 2026")'
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    padding: "13px 18px", fontSize: "12.5px",
                    fontFamily: "var(--font-mono), monospace",
                    color: "var(--t2)", outline: "none",
                  }}
                />
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste Grok output, X threads, news articles, notes…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--bg-card)", border: "none",
                    padding: "14px 18px 56px",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: "12.5px", color: "var(--t1)",
                    resize: "none", lineHeight: 1.65, outline: "none",
                    minHeight: "240px", display: "block",
                  }}
                />
                <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px" }}>
                  {pasteSaved && (
                    <button
                      onClick={() => router.push("/insights")}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--t2)", cursor: "pointer" }}
                    >
                      Insights <ArrowRight size={12} />
                    </button>
                  )}
                  <button
                    onClick={savePane}
                    disabled={pasting || !pasteText.trim()}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "7px 14px", borderRadius: "7px",
                      fontSize: "11px", fontWeight: 600,
                      background: "var(--gold)", color: "#1a1000",
                      border: "none", cursor: "pointer",
                      opacity: (pasting || !pasteText.trim()) ? 0.45 : 1,
                    }}
                  >
                    {pasting ? <Loader2 size={12} className="animate-spin" /> : pasteSaved ? <Check size={12} /> : null}
                    {pasting ? "Saving…" : pasteSaved ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Efficiency tip card */}
          <div style={{ background: "rgba(107,47,217,0.06)", border: "1px solid rgba(107,47,217,0.2)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Lightbulb size={14} strokeWidth={1.75} style={{ color: "var(--purple)", flexShrink: 0, marginTop: "1px" }} />
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--purple-l)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>EFFICIENCY TIP</p>
                <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.65, margin: 0 }}>
                  Paste Grok output directly — it handles unstructured text. Use the label field to track context across sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — intel stream results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {results ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--t2)", margin: 0 }}>
                  Live Intelligence Stream
                </p>
                <button
                  onClick={() => { setResults(null); }}
                  style={{ fontSize: "11px", color: "var(--gold)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Clear All
                </button>
              </div>
              {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => {
                const srcConfig = SOURCES.find((s) => s.key === source);
                return (
                  <div key={source} style={{ background: "var(--bg-card)", border: `1px solid ${srcConfig?.accentBorder ?? "var(--border)"}`, borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: srcConfig?.accentColor ?? "var(--t3)", flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: srcConfig?.accentColor ?? "var(--t2)" }}>
                        {SOURCE_LABELS[source] ?? source}
                      </span>
                      {source === "competitor_topics" && typeof items === "object" && items !== null && !Array.isArray(items) && (
                        <span style={{ fontSize: "10px", color: "var(--t3)", marginLeft: "auto" }}>
                          {(items as Record<string, unknown>).posts_analyzed as number} posts analyzed · {(items as Record<string, unknown>).accounts_sampled as number} accounts
                        </span>
                      )}
                    </div>

                    {/* Competitor Topics — structured topic cards */}
                    {source === "competitor_topics" && typeof items === "object" && items !== null && !Array.isArray(items) && (() => {
                      type Topic = { topic?: string; angle?: string; why_it_works?: string; example_tweet?: string; handle?: string; engagement?: number };
                      const topics = ((items as Record<string, unknown>).topics as Topic[]) ?? [];
                      return topics.length > 0 ? (
                        <div>
                          {topics.map((t, i) => (
                            <div key={i} style={{ padding: "14px 18px", borderBottom: i < topics.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)" }}>{t.topic ?? ""}</span>
                                {t.engagement && <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--green)", flexShrink: 0 }}>{t.engagement} score</span>}
                              </div>
                              {t.angle && <p style={{ fontSize: "12px", color: "var(--gold)", margin: "0 0 4px" }}>Angle: {t.angle}</p>}
                              {t.why_it_works && <p style={{ fontSize: "11px", color: "var(--t3)", margin: "0 0 8px", lineHeight: 1.5 }}>{t.why_it_works}</p>}
                              {t.example_tweet && (
                                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px 10px", borderLeft: "2px solid rgba(34,197,94,0.3)" }}>
                                  <p style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--t2)", margin: "0 0 3px", lineHeight: 1.5 }}>&ldquo;{t.example_tweet}&rdquo;</p>
                                  {t.handle && <span style={{ fontSize: "10px", color: "var(--t3)" }}>@{t.handle}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--t3)" }}>
                          No competitor data yet. Add watched accounts in Niche Intelligence and run a report first.
                        </p>
                      );
                    })()}

                    {/* Google Trends — flat string list */}
                    {source === "google_trends" && Array.isArray(items) && (
                      <div>
                        {(items as string[]).slice(0, 8).map((item, i) => (
                          <div key={i} style={{ padding: "10px 18px", fontSize: "13px", color: "var(--t1)", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CoinGecko */}
                    {source === "coingecko" && Array.isArray(items) && (
                      <div>
                        {(items as Record<string, unknown>[]).slice(0, 8).map((item, i) => (
                          <div key={i} style={{ padding: "10px 18px", fontSize: "13px", color: "var(--t2)", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.03)" : "none", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 500, color: "var(--t1)" }}>{String(item.name ?? "")}</span>
                            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>{String(item.symbol ?? "").toUpperCase()}</span>
                            {item.market_cap_rank != null && <span style={{ fontSize: "10px", color: "var(--t3)" }}>#{String(item.market_cap_rank)}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Telegram */}
                    {source === "telegram" && Array.isArray(items) && (
                      <div>
                        {(items as Record<string, unknown>[]).slice(0, 6).map((item, i) => (
                          <div key={i} style={{ padding: "11px 18px", fontSize: "13px", color: "var(--t2)", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                            <p style={{ marginBottom: "3px", color: "var(--t1)", lineHeight: 1.55 }}>{String(item.text ?? "")}</p>
                            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>@{String(item.channel ?? "")}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fallback for unknown sources */}
                    {!["competitor_topics", "google_trends", "coingecko", "telegram"].includes(source) && (
                      typeof items === "string"
                        ? <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--t2)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{items}</p>
                        : <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--t3)" }}>No results</p>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => router.push("/insights")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}
              >
                Analyze <ArrowRight size={12} />
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--t2)", margin: 0 }}>
                  Live Intelligence Stream
                </p>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)" }} />
                  <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--green)" }}>COMPETITOR TOPICS</span>
                </div>
                <div style={{ padding: "20px 18px" }}>
                  <p style={{ fontSize: "12px", color: "var(--ti)", lineHeight: 1.6, margin: 0 }}>
                    Reads cached competitor tweets. No API calls.<br />
                    Hit <strong style={{ color: "var(--t2)" }}>Run</strong> to discover what topics are getting traction in your niche right now.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
