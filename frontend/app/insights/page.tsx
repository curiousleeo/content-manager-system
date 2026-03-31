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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    setHasResearch(!!store.getResearch());
    const saved = store.getInsights();
    if (saved) setInsights(saved as Insights);
    setProject(store.getProject());
  }, []);

  async function analyze() {
    const research = store.getResearch();
    if (!research) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.insights.analyze(research, project?.id) as { insights: Insights };
      setInsights(result.insights);
      store.setInsights(result.insights);
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
          <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>02</span>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>Insights</h2>
        </div>
        <p className="text-[13px] ml-6" style={{ color: "var(--text-muted)" }}>
          Analyze findings to find angles worth writing about.
        </p>
      </div>

      {!hasResearch && (
        <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>No research data.</span>
          <button onClick={() => router.push("/research")} className="text-[13px] underline underline-offset-2" style={{ color: "var(--accent)" }}>
            Run research first →
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <button
          onClick={analyze}
          disabled={loading || !hasResearch}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {loading ? "Analyzing..." : insights ? "Re-analyze" : "Analyze"}
        </button>
        {insights && (
          <button
            onClick={() => router.push("/content")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
          >
            Generate content <ArrowRight size={13} />
          </button>
        )}
      </div>

      {error && <p className="text-[12px] mb-6 font-mono" style={{ color: "var(--red)" }}>{error}</p>}

      {insights && (
        <div className="flex flex-col gap-5">
          {/* Sentiment badge */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>Sentiment</span>
            {(() => {
              const s = sentimentStyle[insights.sentiment] ?? sentimentStyle.neutral;
              return (
                <span className="text-[12px] font-medium px-2.5 py-1 rounded-lg capitalize" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                  {insights.sentiment}
                </span>
              );
            })()}
          </div>

          <div className="w-full h-px" style={{ background: "var(--border)" }} />

          {categoryConfig.map(({ key, label, icon: Icon, tagStyle, labelColor }) => {
            const items = insights[key as keyof Insights] as string[];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={13} style={{ color: labelColor }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: labelColor }}>
                    {label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-md text-[12px]" style={tagStyle}>
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
