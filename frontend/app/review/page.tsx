"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, X, ChevronRight } from "lucide-react";

interface ReviewResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  ai_likelihood: "low" | "medium" | "high";
}

function scoreColor(s: number) {
  if (s >= 8) return "var(--green)";
  if (s >= 5) return "var(--yellow)";
  return "var(--red)";
}

const aiColors = {
  low:    { color: "var(--green)",  bg: "var(--green-dim)",  border: "var(--green-border)"  },
  medium: { color: "var(--yellow)", bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  high:   { color: "var(--red)",    bg: "var(--red-dim)",    border: "var(--red-border)"    },
};

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
    <div className="p-8 max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>04</span>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>Review</h2>
        </div>
        <p className="text-[13px] ml-6" style={{ color: "var(--text-muted)" }}>
          Check before it goes out. Catches weak angles and AI-sounding language.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-5">
          <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
            Post to review
          </label>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
            rows={5}
            placeholder="Paste or edit your post here."
            className="w-full px-4 py-3 rounded-lg resize-none"
          />
        </div>
        <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={check}
            disabled={loading || !text.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Checking..." : "Run review"}
          </button>
          {result?.passed && (
            <button
              onClick={() => router.push("/schedule")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] transition-all"
              style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
            >
              Schedule <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[12px] mt-4 font-mono" style={{ color: "var(--red)" }}>{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 mt-6">
          {/* Score card */}
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>Quality Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[48px] font-semibold leading-none tracking-tight" style={{ color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                  <span className="text-[18px]" style={{ color: "var(--text-muted)" }}>/10</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{
                    background: result.passed ? "var(--green-dim)" : "var(--red-dim)",
                    border: `1px solid ${result.passed ? "var(--green-border)" : "var(--red-border)"}`,
                    color: result.passed ? "var(--green)" : "var(--red)",
                  }}
                >
                  {result.passed ? "Passed" : "Needs work"}
                </span>
                <span
                  className="text-[12px] px-2.5 py-1 rounded-lg"
                  style={{
                    background: aiColors[result.ai_likelihood].bg,
                    border: `1px solid ${aiColors[result.ai_likelihood].border}`,
                    color: aiColors[result.ai_likelihood].color,
                  }}
                >
                  AI: {result.ai_likelihood}
                </span>
              </div>
            </div>
            {/* Score bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(result.score / 10) * 100}%`, background: scoreColor(result.score) }}
              />
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--red)" }}>
                  Issues ({result.issues.length})
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 text-[13px]" style={{ color: "var(--text-dim)" }}>
                    <X size={13} className="shrink-0 mt-0.5" style={{ color: "var(--red)" }} />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-dim)" }}>
                  Suggestions
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 text-[13px]" style={{ color: "var(--text-dim)" }}>
                    <ChevronRight size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => router.push("/content")} className="text-[13px] w-fit" style={{ color: "var(--text-muted)" }}>
            ← Back to generate
          </button>
        </div>
      )}
    </div>
  );
}
