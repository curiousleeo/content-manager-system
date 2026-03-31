"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

interface Insights {
  trending_topics: string[];
  dying_trends: string[];
  emerging_topics: string[];
  key_themes: string[];
  sentiment: string;
  best_angles: string[];
}

const categoryConfig: {
  key: keyof Insights;
  label: string;
  tagCls: string;
  labelCls: string;
}[] = [
  {
    key: "trending_topics",
    label: "Trending now",
    tagCls: "bg-emerald-950 border-emerald-800 text-emerald-300",
    labelCls: "text-emerald-600",
  },
  {
    key: "emerging_topics",
    label: "About to trend",
    tagCls: "bg-blue-950 border-blue-800 text-blue-300",
    labelCls: "text-blue-600",
  },
  {
    key: "dying_trends",
    label: "Dying out",
    tagCls: "bg-zinc-900 border-zinc-800 text-zinc-600 line-through",
    labelCls: "text-zinc-600",
  },
  {
    key: "key_themes",
    label: "Key themes",
    tagCls: "bg-zinc-900 border-zinc-700 text-zinc-300",
    labelCls: "text-zinc-500",
  },
  {
    key: "best_angles",
    label: "Best angles",
    tagCls: "bg-amber-950 border-amber-800 text-amber-300",
    labelCls: "text-amber-600",
  },
];

const sentimentColor: Record<string, string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-zinc-400",
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
    const data = store.getResearch();
    setHasResearch(!!data);
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
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-1">02 — Insights</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Analyze research findings to find angles worth writing about.
      </p>

      {!hasResearch && (
        <div className="border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500 mb-6">
          No research data.{" "}
          <button
            onClick={() => router.push("/research")}
            className="text-zinc-300 underline underline-offset-2"
          >
            Run research first →
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <button
          onClick={analyze}
          disabled={loading || !hasResearch}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : insights ? "Re-analyze" : "Analyze"}
        </button>
        {insights && (
          <button
            onClick={() => router.push("/content")}
            className="px-5 py-2.5 border border-zinc-700 text-sm rounded hover:bg-zinc-800 transition-colors"
          >
            Generate content →
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-6 font-mono">{error}</p>}

      {insights && (
        <div className="flex flex-col gap-6">
          {/* Sentiment */}
          <div className="flex items-center gap-3 pb-5 border-b border-zinc-800">
            <span className="text-xs font-mono text-zinc-600 uppercase tracking-wide">
              Sentiment
            </span>
            <span
              className={`text-sm font-medium capitalize ${
                sentimentColor[insights.sentiment] ?? "text-zinc-300"
              }`}
            >
              {insights.sentiment}
            </span>
          </div>

          {/* Categories */}
          {categoryConfig.map(({ key, label, tagCls, labelCls }) => {
            const items = insights[key] as string[];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className={`text-xs font-mono uppercase tracking-wide mb-2.5 ${labelCls}`}>
                  {label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <span
                      key={i}
                      className={`border rounded px-3 py-1 text-sm ${tagCls}`}
                    >
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
