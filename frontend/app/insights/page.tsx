"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Sparkles, Hash, Crosshair, ChevronDown, Zap } from "lucide-react";

interface Insights {
  trending_topics: string[];
  dying_trends: string[];
  emerging_topics: string[];
  key_themes: string[];
  sentiment: string;
  best_angles: string[];
}

const FILTERS = ["Trending Now", "About to Trend", "Dying Out", "Key Themes", "Best Angles", "Sentiment"];

const categoryConfig = [
  { key: "trending_topics",  label: "Trending now",   icon: TrendingUp,   tagColor: "var(--gold)",     tagDim: "rgba(255,184,0,0.08)",     tagBorder: "rgba(255,184,0,0.2)"    },
  { key: "emerging_topics",  label: "About to trend", icon: Sparkles,     tagColor: "var(--blue)",     tagDim: "rgba(29,161,242,0.08)",    tagBorder: "rgba(29,161,242,0.2)"   },
  { key: "dying_trends",     label: "Dying out",      icon: TrendingDown, tagColor: "var(--t3)",       tagDim: "rgba(255,255,255,0.04)",   tagBorder: "rgba(255,255,255,0.08)" },
  { key: "key_themes",       label: "Key themes",     icon: Hash,         tagColor: "var(--t2)",       tagDim: "rgba(255,255,255,0.04)",   tagBorder: "rgba(255,255,255,0.08)" },
  { key: "best_angles",      label: "Best angles",    icon: Crosshair,    tagColor: "var(--gold-soft)", tagDim: "rgba(255,184,0,0.06)",    tagBorder: "rgba(255,184,0,0.15)"   },
] as const;

export default function InsightsPage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [insights, setInsights]   = useState<Insights | null>(null);
  const [error, setError]         = useState("");
  const [hasResearch, setHasResearch] = useState(false);
  const [fromDB, setFromDB]       = useState(false);
  const [activeFilter, setActiveFilter] = useState("Trending Now");
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({ "0": true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject]     = useState<any>(null);

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    const saved = store.getInsights();
    if (saved) setInsights(saved as Insights);
    if (store.getResearch()) {
      setHasResearch(true);
    } else {
      api.insights.latest(proj?.id).then((res) => {
        if (res.insights) {
          setInsights(res.insights as unknown as Insights);
          setHasResearch(true); setFromDB(true);
          store.setInsights(res.insights);
          if (res.research_id) store.setResearchId(res.research_id);
        }
      }).catch(() => {});
    }
  }, []);

  async function analyze() {
    const research = store.getResearch();
    if (!research) return;
    setLoading(true); setError(""); setFromDB(false);
    try {
      const researchId = store.getResearchId();
      const result = await api.insights.analyze(research, project?.id, researchId);
      setInsights(result.insights as unknown as Insights);
      store.setInsights(result.insights);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const toggleSection = (idx: number) =>
    setExpanded((e) => ({ ...e, [idx]: !e[idx] }));

  const sentimentColors: Record<string, { color: string; bg: string; border: string }> = {
    positive: { color: "var(--green)", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.22)"  },
    negative: { color: "var(--red)",   bg: "rgba(239,68,68,0.09)",  border: "rgba(239,68,68,0.22)"  },
    neutral:  { color: "var(--t2)",    bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.10)" },
  };

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "6px", margin: "0 0 6px" }}>
            Cognitive Core
          </p>
          <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1, margin: 0 }}>
            Market Intelligence
          </h1>
        </div>
        <button
          onClick={analyze}
          disabled={loading || !hasResearch}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "12px 22px", borderRadius: "8px",
            fontSize: "13px", fontWeight: 700,
            background: "var(--gold)", color: "#1a1000",
            border: "none", cursor: "pointer",
            opacity: (loading || !hasResearch) ? 0.45 : 1,
            fontFamily: "var(--font-manrope), sans-serif",
            letterSpacing: "0.4px",
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} strokeWidth={2} />}
          {loading ? "Analyzing…" : "Analyze Latest Research"}
        </button>
      </div>

      {fromDB && (
        <div style={{ padding: "10px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)", fontSize: "12px", color: "var(--blue)" }}>
          Loaded from DB — showing last saved insights. Run Research to refresh.
        </div>
      )}

      {!hasResearch && (
        <div style={{ padding: "10px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "var(--t2)", display: "flex", alignItems: "center", gap: "8px" }}>
          No research found.
          <button onClick={() => router.push("/research")} style={{ color: "var(--gold)", background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: 0, fontWeight: 600 }}>
            Run Research first →
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", marginBottom: "16px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>
          {error}
        </div>
      )}

      {insights ? (
        <>
          {/* ── Two-column main grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "8fr 4fr", gap: "20px", marginBottom: "22px", alignItems: "start" }}>

            {/* Left — large analysis card */}
            <div style={{
              background: "rgba(31,31,37,0.65)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "26px",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Gold shimmer line */}
              <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,220,161,0.3), transparent)" }} />

              {/* Label */}
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "18px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />
                <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--t2)", margin: 0 }}>
                  Claude&apos;s Sovereign Analysis
                </p>
              </div>

              {/* Blockquote — best angle or fallback */}
              <blockquote style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontWeight: 700, fontSize: "21px", lineHeight: 1.4,
                color: "var(--t1)", marginBottom: "18px",
                borderLeft: "3px solid var(--gold)", paddingLeft: "18px",
                fontStyle: "normal", margin: "0 0 18px",
              }}>
                {insights.best_angles?.[0] ?? "The current social landscape is shifting — find your angle before it peaks."}
              </blockquote>

              {/* Body — trending topics as highlights */}
              {insights.trending_topics?.length > 0 && (
                <p style={{ fontSize: "13.5px", color: "rgba(228,225,233,0.72)", lineHeight: 1.75, marginBottom: "18px" }}>
                  {insights.trending_topics.slice(0, 4).map((topic, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      <span style={{ color: "var(--gold-soft)", fontWeight: 600 }}>{topic}</span>
                    </span>
                  ))}
                  {insights.trending_topics.length > 4 && (
                    <span style={{ color: "rgba(228,225,233,0.72)" }}> and {insights.trending_topics.length - 4} more signals are driving conversation in your niche.</span>
                  )}
                </p>
              )}

              {/* Sentiment badge */}
              {(() => {
                const sc = sentimentColors[insights.sentiment] ?? sentimentColors.neutral;
                return (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "6px", background: sc.bg, border: `1px solid ${sc.border}`, marginBottom: "20px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.color }} />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: sc.color, letterSpacing: "0.8px", textTransform: "uppercase" }}>{insights.sentiment} sentiment</span>
                  </div>
                );
              })()}

              {/* CTA */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "4px" }}>
                <button
                  onClick={() => router.push("/content")}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", letterSpacing: "0.4px" }}
                >
                  Generate content → <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Right — two stacked cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Network Pulse */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "14px" }}>Network Pulse</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "Momentum", value: insights.trending_topics?.length ?? 0, max: 10, color: "var(--gold)"      },
                    { label: "Emerging", value: insights.emerging_topics?.length ?? 0, max: 10, color: "var(--blue)"      },
                    { label: "Angles",   value: insights.best_angles?.length ?? 0,     max: 8,  color: "var(--gold-soft)" },
                  ].map(({ label, value, max, color }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "11px", color: "var(--t2)" }}>{label}</span>
                        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>{value}/{max}</span>
                      </div>
                      <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.07)" }}>
                        <div style={{ height: "100%", borderRadius: "2px", width: `${Math.min((value / max) * 100, 100)}%`, background: color, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal Distribution */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "14px" }}>Signal Distribution</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { label: "Trending", pct: insights.trending_topics?.length ?? 0, color: "var(--gold)"     },
                    { label: "Emerging", pct: insights.emerging_topics?.length ?? 0, color: "var(--blue)"     },
                    { label: "Dying",    pct: insights.dying_trends?.length ?? 0,    color: "var(--t3)"       },
                    { label: "Themes",   pct: insights.key_themes?.length ?? 0,      color: "var(--purple-l)" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", color: "var(--t2)", flex: 1 }}>{label}</span>
                      <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>{pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Filter chips ── */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.7px", textTransform: "uppercase",
                  border: `1px solid ${activeFilter === f ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
                  background: activeFilter === f ? "var(--gold)" : "transparent",
                  color: activeFilter === f ? "#1a1000" : "var(--t2)",
                  padding: "5px 13px", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* ── Collapsible sections ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {categoryConfig.map(({ key, label, icon: Icon, tagColor, tagDim, tagBorder }, idx) => {
              const items = insights[key as keyof Insights] as string[];
              if (!items?.length) return null;
              const isExp = !!expanded[idx];
              return (
                <div
                  key={key}
                  style={{
                    background: "var(--bg-card2)",
                    border: `1px solid var(--border)`,
                    borderLeft: isExp ? "3px solid var(--gold)" : "1px solid var(--border)",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => toggleSection(idx)}
                    style={{ width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <Icon size={14} strokeWidth={1.75} style={{ color: isExp ? "var(--gold)" : "var(--t3)" }} />
                      <span style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "14px", color: isExp ? "var(--t1)" : "var(--t2)" }}>
                        {label}
                      </span>
                      <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>
                        {items.length}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      strokeWidth={1.75}
                      style={{
                        color: isExp ? "var(--gold)" : "var(--t3)",
                        transform: isExp ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                        opacity: isExp ? 1 : 0.5,
                      }}
                    />
                  </button>
                  {isExp && (
                    <div style={{ padding: "0 20px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                        {items.map((item, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "5px 12px", borderRadius: "6px",
                              fontSize: "12.5px",
                              background: tagDim,
                              border: `1px solid ${tagBorder}`,
                              color: tagColor,
                              lineHeight: 1.4,
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--t3)" }}>
          <p style={{ fontSize: "14px", marginBottom: "8px", color: "var(--t2)" }}>No insights yet.</p>
          <p style={{ fontSize: "12px", color: "var(--t3)" }}>
            {!hasResearch ? "Run Research first, then click Analyze." : "Click Analyze Latest Research to generate market intelligence."}
          </p>
        </div>
      )}
    </div>
  );
}
