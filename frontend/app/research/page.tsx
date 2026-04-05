"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Search, Zap, Loader2, Check, ArrowRight, Lightbulb } from "lucide-react";

const SOURCES = [
  { key: "google_trends", label: "Google Trends",   accentColor: "var(--gold)",     accentDim: "rgba(255,184,0,0.10)",    accentBorder: "rgba(255,184,0,0.25)"    },
  { key: "coingecko",     label: "CoinGecko",        accentColor: "var(--purple-l)", accentDim: "rgba(107,47,217,0.10)",   accentBorder: "rgba(107,47,217,0.25)"   },
  { key: "youtube",       label: "YouTube",           accentColor: "var(--red)",      accentDim: "rgba(239,68,68,0.08)",    accentBorder: "rgba(239,68,68,0.20)"    },
  { key: "telegram",      label: "Telegram",          accentColor: "var(--blue)",     accentDim: "rgba(29,161,242,0.08)",   accentBorder: "rgba(29,161,242,0.20)"   },
  { key: "grok_manual",   label: "Grok Manual",       accentColor: "var(--t2)",       accentDim: "rgba(255,255,255,0.05)",  accentBorder: "rgba(255,255,255,0.12)"  },
];

const SOURCE_LABELS: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [sources, setSources]   = useState<string[]>(["google_trends"]);
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
    s.key === "google_trends" || s.key === "grok_manual" || (s.key === "coingecko" && coingeckoEnabled)
  );

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
          SOVEREIGN INTEL
        </p>
        <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1 }}>
          Research
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t2)", marginTop: "8px" }}>
          Search live sources or paste raw research from Grok, threads, news.
        </p>
      </div>

      {/* ── Source filter chips ── */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {availableSources.map((s) => {
          const on = sources.includes(s.key);
          return (
            <button key={s.key} onClick={() => toggleSource(s.key)} style={{
              borderRadius: "20px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.7px", textTransform: "uppercase",
              border: `1px solid ${on ? s.accentBorder : "rgba(255,255,255,0.1)"}`,
              background: on ? s.accentDim : "transparent",
              color: on ? s.accentColor : "var(--t2)",
              padding: "5px 13px", cursor: "pointer", transition: "all 0.12s",
            }}>
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

      {/* ── Full-width search bar ── */}
      <div style={{ display: "flex", gap: "0", marginBottom: "28px", background: "var(--bg-mid)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
        <Search size={16} strokeWidth={1.75} style={{ alignSelf: "center", marginLeft: "18px", color: "var(--t3)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Search topic, keyword, narrative…"
          style={{ flex: 1, background: "transparent", border: "none", padding: "13px 16px", fontSize: "14px", color: "var(--t1)", outline: "none" }}
        />
        {pillars.length > 0 && (
          <div style={{ display: "flex", gap: "6px", alignSelf: "center", padding: "0 12px", borderLeft: "1px solid var(--border)" }}>
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
            padding: "0 22px", background: "var(--gold)", color: "#1a1000",
            fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "12px",
            border: "none", cursor: "pointer", opacity: (loading || !query.trim()) ? 0.5 : 1,
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
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--t3)" }}>
                Grok / Manual Paste
              </p>
            </div>
            <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                value={pasteQuery}
                onChange={(e) => setPasteQuery(e.target.value)}
                placeholder='Label (e.g. "Grok — BTC perps Apr 2026")'
                style={{ background: "var(--bg-mid)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "9px 13px", fontSize: "13px", color: "var(--t1)" }}
              />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder="Paste Grok output, X threads, news articles, notes…"
                style={{ background: "var(--bg-mid)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "11px 13px", fontSize: "13px", color: "var(--t1)", resize: "vertical", lineHeight: 1.6, outline: "none" }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={savePane}
                  disabled={pasting || !pasteText.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    padding: "9px 18px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 600,
                    letterSpacing: "0.6px", textTransform: "uppercase",
                    background: "var(--gold)", color: "#1a1000",
                    border: "none", cursor: "pointer",
                    opacity: (pasting || !pasteText.trim()) ? 0.45 : 1,
                  }}
                >
                  {pasting ? <Loader2 size={13} className="animate-spin" /> : pasteSaved ? <Check size={13} /> : null}
                  {pasting ? "Saving…" : pasteSaved ? "Saved!" : "Save Research"}
                </button>
                {pasteSaved && (
                  <button onClick={() => router.push("/insights")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--t2)", cursor: "pointer", letterSpacing: "0.5px" }}>
                    Insights <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Efficiency tip card */}
          <div style={{ background: "rgba(255,184,0,0.04)", border: "1px solid rgba(255,184,0,0.15)", borderRadius: "12px", padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Lightbulb size={14} strokeWidth={1.75} style={{ color: "var(--gold)", flexShrink: 0, marginTop: "1px" }} />
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--gold)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Efficiency tip</p>
                <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.65 }}>
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
                <p style={{ fontSize: "13px", color: "var(--t2)" }}>
                  Results for <strong style={{ color: "var(--t1)", fontWeight: 600 }}>{(results as { query?: string }).query}</strong>
                </p>
                <button onClick={() => router.push("/insights")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Analyze <ArrowRight size={12} />
                </button>
              </div>
              {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => {
                const srcConfig = SOURCES.find((s) => s.key === source);
                return (
                  <div key={source} style={{ background: "var(--bg-card)", border: `1px solid ${srcConfig?.accentBorder ?? "var(--border)"}`, borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: srcConfig?.accentColor ?? "var(--t3)", flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: srcConfig?.accentColor ?? "var(--t2)" }}>
                        {SOURCE_LABELS[source] ?? source}
                      </span>
                    </div>
                    {Array.isArray(items) && items.length > 0 ? (
                      <div>
                        {(items as Record<string, unknown>[]).slice(0, 8).map((item, i) => (
                          <div key={i} style={{ padding: "11px 18px", fontSize: "13px", color: "var(--t2)", borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.03)" : "none", lineHeight: 1.5 }}>
                            {source === "google_trends" && <span style={{ color: "var(--t1)" }}>{String(item)}</span>}
                            {source === "coingecko" && (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 500, color: "var(--t1)" }}>{String((item as Record<string, unknown>).name ?? "")}</span>
                                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>{String((item as Record<string, unknown>).symbol ?? "").toUpperCase()}</span>
                                {(item as Record<string, unknown>).market_cap_rank != null && (
                                  <span style={{ fontSize: "10px", color: "var(--t3)" }}>#{String((item as Record<string, unknown>).market_cap_rank)}</span>
                                )}
                              </div>
                            )}
                            {source === "telegram" && (
                              <div>
                                <p style={{ marginBottom: "3px", color: "var(--t1)", lineHeight: 1.55 }}>{String((item as Record<string, unknown>).text ?? "")}</p>
                                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>@{String((item as Record<string, unknown>).channel ?? "")}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : typeof items === "string" ? (
                      <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--t2)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{items}</p>
                    ) : (
                      <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--t3)" }}>No results</p>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {["GOOGLE TRENDS", "COINGECKO", "GROK MANUAL"].map((label, i) => {
                const colors = [
                  { color: "var(--gold)",     border: "rgba(255,184,0,0.15)"    },
                  { color: "var(--purple-l)", border: "rgba(107,47,217,0.15)"   },
                  { color: "var(--t3)",       border: "rgba(255,255,255,0.07)"  },
                ];
                return (
                  <div key={label} style={{ background: "var(--bg-card)", border: `1px solid ${colors[i].border}`, borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors[i].color }} />
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: colors[i].color }}>{label}</span>
                    </div>
                    <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[...Array(3)].map((_, j) => (
                        <div key={j} style={{ height: "12px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", width: j === 0 ? "80%" : j === 1 ? "65%" : "50%" }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
