"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, TrendingUp, TrendingDown, Sparkles, Hash, Crosshair } from "lucide-react";

interface Insights {
  trending_topics: string[];
  dying_trends: string[];
  emerging_topics: string[];
  key_themes: string[];
  sentiment: string;
  best_angles: string[];
}

const categoryConfig = [
  { key: "trending_topics",  label: "Trending now",    icon: TrendingUp,   tagStyle: { background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)" }, labelColor: "var(--green)" },
  { key: "emerging_topics",  label: "About to trend",  icon: Sparkles,     tagStyle: { background: "var(--blue-dim)",  border: "1px solid var(--blue-border)",   color: "var(--blue)"  }, labelColor: "var(--blue)"  },
  { key: "dying_trends",     label: "Dying out",       icon: TrendingDown, tagStyle: { background: "var(--surface-3)", border: "1px solid var(--border-2)",       color: "var(--text-muted)", textDecoration: "line-through" as const }, labelColor: "var(--text-muted)" },
  { key: "key_themes",       label: "Key themes",      icon: Hash,         tagStyle: { background: "var(--surface-2)", border: "1px solid var(--border-2)",       color: "var(--text-dim)"  }, labelColor: "var(--text-dim)"  },
  { key: "best_angles",      label: "Best angles",     icon: Crosshair,    tagStyle: { background: "var(--yellow-dim)",border: "1px solid var(--yellow-border)",  color: "var(--yellow)" }, labelColor: "var(--yellow)" },
] as const;

const sentimentStyle: Record<string, { color: string; bg: string; border: string }> = {
  positive: { color: "var(--green)",    bg: "var(--green-dim)",  border: "var(--green-border)"  },
  negative: { color: "var(--red)",      bg: "var(--red-dim)",    border: "var(--red-border)"    },
  neutral:  { color: "var(--text-dim)", bg: "var(--surface-3)",  border: "var(--border-2)"      },
};

export default function InsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [hasResearch, setHasResearch] = useState(false);
  const [fromDB, setFromDB] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);

    const saved = store.getInsights();
    if (saved) setInsights(saved as Insights);

    if (store.getResearch()) {
      setHasResearch(true);
    } else {
      // DB fallback: load latest insights from API
      api.insights.latest(proj?.id).then((res) => {
        if (res.insights) {
          setInsights(res.insights as unknown as Insights);
          setHasResearch(true);
          setFromDB(true);
          // Hydrate store so downstream pages can use it
          store.setInsights(res.insights);
          if (res.research_id) store.setResearchId(res.research_id);
        }
      }).catch(() => {/* silently ignore */});
    }
  }, []);

  async function analyze() {
    const research = store.getResearch();
    if (!research) return;
    setLoading(true);
    setError("");
    setFromDB(false);
    try {
      const researchId = store.getResearchId();
      const result = await api.insights.analyze(research, project?.id, researchId);
      setInsights(result.insights as unknown as Insights);
      store.setInsights(result.insights);
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
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>02</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Insights</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Analyze findings to find angles worth writing about.
        </p>
      </div>

      {!hasResearch && (
        <div style={{ borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>No research data.</span>
          <button onClick={() => router.push("/research")} style={{ fontSize: "14px", textDecoration: "underline", textUnderlineOffset: "2px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
            Run research first →
          </button>
        </div>
      )}

      {fromDB && (
        <div style={{ borderRadius: "10px", padding: "10px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
          <span style={{ fontSize: "13px", color: "var(--blue)" }}>Loaded from DB — showing last saved insights. Run research to refresh.</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "36px" }}>
        <button
          onClick={analyze}
          disabled={loading || !hasResearch}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (loading || !hasResearch) ? 0.4 : 1, transition: "opacity 0.15s" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Analyzing..." : insights ? "Re-analyze" : "Analyze"}
        </button>
        {insights && (
          <button
            onClick={() => router.push("/content")}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", transition: "opacity 0.15s" }}
          >
            Generate content <ArrowRight size={14} />
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: "13px", marginBottom: "24px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}

      {insights && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Sentiment badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Sentiment</span>
            {(() => {
              const s = sentimentStyle[insights.sentiment] ?? sentimentStyle.neutral;
              return (
                <span style={{ fontSize: "13px", fontWeight: 500, padding: "5px 14px", borderRadius: "8px", textTransform: "capitalize", background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                  {insights.sentiment}
                </span>
              );
            })()}
          </div>

          <div style={{ width: "100%", height: "1px", background: "var(--border)" }} />

          {categoryConfig.map(({ key, label, icon: Icon, tagStyle, labelColor }) => {
            const items = insights[key as keyof Insights] as string[];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Icon size={14} style={{ color: labelColor }} />
                  <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: labelColor }}>
                    {label}
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {items.map((item, i) => (
                    <span key={i} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "13px", ...tagStyle }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
