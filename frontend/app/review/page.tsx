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
    <div style={{ padding: "52px 64px", maxWidth: "760px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>04</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Review</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Check before it goes out. Catches weak angles and AI-sounding language.
        </p>
      </div>

      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={{ padding: "28px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Post to review
          </label>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
            rows={6}
            placeholder="Paste or edit your post here."
            style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", resize: "none", fontSize: "14px", lineHeight: 1.7 }}
          />
        </div>
        <div style={{ padding: "16px 28px", display: "flex", gap: "10px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={check}
            disabled={loading || !text.trim()}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (loading || !text.trim()) ? 0.4 : 1, transition: "opacity 0.15s" }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Checking..." : "Run review"}
          </button>
          {result?.passed && (
            <button
              onClick={() => router.push("/schedule")}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
            >
              Schedule <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "28px" }}>

          {/* Score card */}
          <div style={{ borderRadius: "14px", padding: "28px", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", color: "var(--text-muted)" }}>Quality Score</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "56px", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                  <span style={{ fontSize: "20px", color: "var(--text-muted)" }}>/10</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                <span style={{
                  fontSize: "13px", fontWeight: 600, padding: "6px 14px", borderRadius: "8px",
                  background: result.passed ? "var(--green-dim)" : "var(--red-dim)",
                  border: `1px solid ${result.passed ? "var(--green-border)" : "var(--red-border)"}`,
                  color: result.passed ? "var(--green)" : "var(--red)",
                }}>
                  {result.passed ? "Passed" : "Needs work"}
                </span>
                <span style={{
                  fontSize: "13px", padding: "6px 14px", borderRadius: "8px",
                  background: aiColors[result.ai_likelihood].bg,
                  border: `1px solid ${aiColors[result.ai_likelihood].border}`,
                  color: aiColors[result.ai_likelihood].color,
                }}>
                  AI: {result.ai_likelihood}
                </span>
              </div>
            </div>
            <div style={{ height: "4px", borderRadius: "9999px", overflow: "hidden", background: "var(--surface-3)" }}>
              <div style={{ height: "100%", borderRadius: "9999px", width: `${(result.score / 10) * 100}%`, background: scoreColor(result.score), transition: "width 0.7s ease" }} />
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--red)" }}>
                  Issues ({result.issues.length})
                </p>
              </div>
              <div>
                {result.issues.map((issue, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 24px", fontSize: "14px", color: "var(--text-dim)", borderBottom: i < result.issues.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <X size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--red)" }} />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                  Suggestions
                </p>
              </div>
              <div>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 24px", fontSize: "14px", color: "var(--text-dim)", borderBottom: i < result.suggestions.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <ChevronRight size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--text-muted)" }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => router.push("/content")} style={{ fontSize: "14px", width: "fit-content", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            ← Back to generate
          </button>
        </div>
      )}
    </div>
  );
}
