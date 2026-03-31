"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

interface ReviewResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  ai_likelihood: "low" | "medium" | "high";
}

const aiLikelihoodColor = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

const aiLikelihoodBg = {
  low: "bg-emerald-950 border-emerald-800",
  medium: "bg-yellow-950 border-yellow-800",
  high: "bg-red-950 border-red-800",
};

function scoreColor(s: number) {
  if (s >= 8) return "text-emerald-400";
  if (s >= 5) return "text-yellow-400";
  return "text-red-400";
}

function scoreBarWidth(s: number) {
  return `${(s / 10) * 100}%`;
}

function scoreBarColor(s: number) {
  if (s >= 8) return "bg-emerald-500";
  if (s >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

export default function ReviewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
  }, []);

  async function check() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.review.check(text, "x") as { review: ReviewResult };
      setResult(res.review);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">04 — Review</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Check before it goes out. Catches weak angles and AI-sounding language.
      </p>

      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Post to review
        </label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            store.setContent(e.target.value);
          }}
          rows={5}
          placeholder="Paste or edit your post here."
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={check}
          disabled={loading || !text.trim()}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Checking..." : "Run review"}
        </button>
        {result?.passed && (
          <button
            onClick={() => router.push("/schedule")}
            className="px-5 py-2.5 border border-zinc-700 text-sm rounded hover:bg-zinc-800 transition-colors"
          >
            Schedule →
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4 font-mono">{error}</p>}

      {result && (
        <div className="flex flex-col gap-6">
          {/* Score card */}
          <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-900">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-zinc-600 uppercase tracking-wide mb-1">
                  Quality score
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-bold tracking-tight ${scoreColor(result.score)}`}>
                    {result.score}
                  </span>
                  <span className="text-zinc-600 text-xl">/10</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Pass/fail badge */}
                <span
                  className={`text-xs font-mono font-medium px-2.5 py-1 rounded border ${
                    result.passed
                      ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                      : "bg-red-950 border-red-900 text-red-400"
                  }`}
                >
                  {result.passed ? "Passed" : "Needs work"}
                </span>
                {/* AI likelihood badge */}
                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded border ${aiLikelihoodBg[result.ai_likelihood]}`}
                >
                  <span className={aiLikelihoodColor[result.ai_likelihood]}>
                    AI:{" "}
                  </span>
                  <span className="text-zinc-400">{result.ai_likelihood}</span>
                </span>
              </div>
            </div>
            {/* Score bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(result.score)}`}
                style={{ width: scoreBarWidth(result.score) }}
              />
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div>
              <p className="text-xs font-mono text-red-600 uppercase tracking-wide mb-3">
                Issues ({result.issues.length})
              </p>
              <ul className="flex flex-col gap-2">
                {result.issues.map((issue, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-zinc-300 bg-red-950/30 border border-red-900/40 rounded px-3 py-2.5"
                  >
                    <span className="text-red-500 shrink-0">×</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide mb-3">
                Suggestions
              </p>
              <ul className="flex flex-col gap-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-400">
                    <span className="text-zinc-600 shrink-0 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => router.push("/content")}
            className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors w-fit"
          >
            ← Back to generate
          </button>
        </div>
      )}
    </div>
  );
}
