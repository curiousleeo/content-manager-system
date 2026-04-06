"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, ChevronDown, ToggleLeft, ToggleRight, AlertTriangle, Ban, Lightbulb, TrendingUp, CheckCircle, Target } from "lucide-react";

interface ReviewResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  ai_likelihood: "low" | "medium" | "high";
}

function scoreColor(s: number) {
  if (s >= 8) return "var(--green)";
  if (s >= 5) return "var(--gold)";
  return "var(--red)";
}

export default function ReviewPage() {
  const router = useRouter();
  const [text, setText]               = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ReviewResult | null>(null);
  const [error, setError]             = useState("");
  const [drafts, setDrafts]           = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [autoQueue, setAutoQueue]     = useState(false);
  const [togglingQueue, setTogglingQueue] = useState(false);
  const [fromDB, setFromDB]           = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject]         = useState<any>(null);

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    const saved = store.getContent();
    if (saved) { setText(saved); }
    else { setPickerOpen(true); loadDrafts(proj?.id); setFromDB(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDrafts(projectId?: number) {
    setDraftsLoading(true);
    try { const res = await api.content.drafts(projectId); setDrafts(res.drafts); }
    catch { /**/ }
    finally { setDraftsLoading(false); }
  }

  function selectDraft(draft: Draft) {
    setText(draft.text); store.setContent(draft.text);
    setSelectedDraftId(draft.id); setAutoQueue(draft.auto_queue);
    setResult(null); setPickerOpen(false);
  }

  async function check() {
    if (!text.trim()) return;
    setLoading(true); setError("");
    try {
      const draftId = store.getDraftId() ?? selectedDraftId ?? null;
      const res = await api.review.check(text, "x", project?.id ?? null, draftId);
      setResult(res.review as unknown as ReviewResult);
      if (res.draft_id) store.setDraftId(res.draft_id);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function toggleAutoQueue() {
    if (!selectedDraftId) return;
    setTogglingQueue(true);
    try {
      const updated = await api.content.setAutoQueue(selectedDraftId, !autoQueue);
      setAutoQueue(updated.auto_queue);
    } catch { /**/ }
    finally { setTogglingQueue(false); }
  }

  const aiColors = {
    low:    { color: "var(--green)", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.22)"  },
    medium: { color: "var(--amber)", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.22)" },
    high:   { color: "var(--red)",   bg: "rgba(239,68,68,0.09)",  border: "rgba(239,68,68,0.22)"  },
  };

  const violations = [
    ...(result?.issues ?? []).map((t) => ({ type: "block" as const, title: t, desc: "Issue flagged by review" })),
    ...(result?.suggestions ?? []).map((t) => ({ type: "tip" as const, title: t, desc: "Suggested improvement" })),
  ];

  const violationIcon = { warn: AlertTriangle, block: Ban, tip: Lightbulb, up: TrendingUp };
  const violationStyle = {
    warn:  { bg: "rgba(245,158,11,0.12)", color: "var(--amber)"    },
    block: { bg: "rgba(239,68,68,0.1)",   color: "var(--red)"      },
    tip:   { bg: "rgba(255,184,0,0.1)",   color: "var(--gold)"     },
    up:    { bg: "rgba(107,47,217,0.1)",  color: "var(--purple-l)" },
  };

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
            Editorial Gate
          </p>
          <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1 }}>
            Post Analysis
          </h1>
        </div>
        {selectedDraftId && (
          <span style={{ fontSize: "11px", color: "var(--t3)", letterSpacing: "1px", fontFamily: "var(--font-mono), monospace" }}>
            QUEUE: PRJ-{selectedDraftId}
          </span>
        )}
      </div>

      {fromDB && (
        <div style={{ padding: "10px 16px", marginBottom: "16px", borderRadius: "8px", background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)", fontSize: "12px", color: "var(--blue)" }}>
          Loaded from DB — pick a draft below or start pipeline from Research.
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>

        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Draft meta card */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "22px", marginBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ background: "rgba(255,184,0,0.08)", color: "var(--gold)", fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "4px", letterSpacing: "0.5px" }}>
                {selectedDraftId ? `Draft #${selectedDraftId}` : "X / Twitter Draft"}
              </span>
              {selectedDraftId && (
                <span style={{ background: "var(--bg-elev)", color: "var(--t2)", fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "4px" }}>
                  V2.4
                </span>
              )}
              <span style={{ fontSize: "10px", color: "var(--t3)", marginLeft: "auto" }}>
                {text.length} Characters
              </span>
            </div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.75, fontStyle: text ? "normal" : "italic", color: text ? "var(--t1)" : "var(--t3)" }}>
              {text || "No draft selected yet — pick one from the draft picker below."}
            </div>
          </div>

          {/* Draft picker */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <button
              onClick={() => { if (!pickerOpen && drafts.length === 0) loadDrafts(project?.id); setPickerOpen(!pickerOpen); }}
              style={{ width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--t2)" }}>
                {selectedDraftId ? `Draft #${selectedDraftId} selected` : "Pick from drafts"}
              </span>
              <ChevronDown size={14} strokeWidth={1.75} style={{ color: "var(--t3)", transform: pickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {pickerOpen && (
              <div style={{ borderTop: "1px solid var(--border)", maxHeight: "300px", overflowY: "auto" }}>
                {draftsLoading ? (
                  <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
                    <Loader2 size={15} className="animate-spin" style={{ color: "var(--t3)" }} />
                  </div>
                ) : drafts.length === 0 ? (
                  <p style={{ padding: "16px 18px", fontSize: "12px", color: "var(--t3)" }}>No drafts — generate some first.</p>
                ) : drafts.map((draft) => (
                  <button key={draft.id} onClick={() => selectDraft(draft)} style={{ width: "100%", textAlign: "left", padding: "12px 18px", display: "flex", flexDirection: "column", gap: "3px", background: selectedDraftId === draft.id ? "var(--bg-card2)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--t3)" }}>{draft.topic}</span>
                      {draft.auto_queue && <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,184,0,0.08)", color: "var(--gold)", fontWeight: 600 }}>queued</span>}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--t2)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "500px" }}>{draft.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Textarea */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Post to Review</p>
            </div>
            <div style={{ padding: "18px" }}>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
                rows={7}
                placeholder="Paste or edit your post, or pick a draft above."
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "13.5px", color: "var(--t1)", lineHeight: 1.7, resize: "none", fontFamily: "var(--font-inter), sans-serif" }}
              />
            </div>
            {selectedDraftId && (
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                <button onClick={toggleAutoQueue} disabled={togglingQueue} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--gold)" : "var(--t3)", display: "flex", alignItems: "center", gap: "6px", opacity: togglingQueue ? 0.4 : 1 }}>
                  {autoQueue ? <ToggleRight size={18} strokeWidth={1.75} /> : <ToggleLeft size={18} strokeWidth={1.75} />}
                  <span style={{ fontSize: "11px", color: autoQueue ? "var(--gold)" : "var(--t2)" }}>{autoQueue ? "In auto-queue" : "Add to auto-queue"}</span>
                </button>
              </div>
            )}
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "var(--bg-card2)", display: "flex", gap: "8px" }}>
              <button onClick={check} disabled={loading || !text.trim()} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 22px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (loading || !text.trim()) ? 0.45 : 1, fontFamily: "var(--font-manrope), sans-serif" }}>
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? "Checking…" : "Run Review"}
              </button>
              {result?.passed && (
                <button onClick={() => router.push("/schedule")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.14)", color: "var(--t1)", background: "transparent", cursor: "pointer" }}>
                  Approve and Schedule <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          {error && <p style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>{error}</p>}
        </div>

        {/* Right — score cards + violations */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {result ? (
            <>
              {/* Score cards 2-col */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px" }}>
                {/* Quality Score */}
                <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,184,0,0.25)", borderRadius: "12px", textAlign: "center", padding: "20px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>Quality Score</p>
                  <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "40px", fontWeight: 800, letterSpacing: "-2px", color: scoreColor(result.score), lineHeight: 1 }}>
                    {result.score}
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: result.passed ? "var(--green)" : "var(--red)", marginTop: "7px" }}>
                    {result.passed ? "Excellent" : "Needs Work"}
                  </div>
                </div>
                {/* AI Likelihood */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", textAlign: "center", padding: "20px" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>AI Human Score</p>
                  <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "40px", fontWeight: 800, letterSpacing: "-2px", color: "var(--t1)", lineHeight: 1 }}>
                    {result.ai_likelihood === "low" ? "94%" : result.ai_likelihood === "medium" ? "62%" : "31%"}
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--purple-l)", marginTop: "7px" }}>
                    {result.ai_likelihood === "low" ? "High Auth." : result.ai_likelihood === "medium" ? "Borderline" : "AI Detected"}
                  </div>
                </div>
              </div>

              {/* Violations */}
              {violations.length > 0 && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--t3)" }}>Critical Violations</p>
                  </div>
                  <div style={{ padding: "8px 18px" }}>
                    {violations.map((v, i) => {
                      const VIcon = violationIcon[v.type];
                      const vs = violationStyle[v.type];
                      return (
                        <div key={i} style={{ display: "flex", gap: "11px", padding: "13px 0", borderBottom: i < violations.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: vs.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <VIcon size={13} strokeWidth={1.75} style={{ color: vs.color }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", marginBottom: "3px" }}>{v.title}</p>
                            <p style={{ fontSize: "11px", color: "var(--t3)", lineHeight: 1.5 }}>{v.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Brand Voice alignment */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <Target size={15} strokeWidth={1.75} style={{ color: "var(--purple-l)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "5px" }}>Brand Voice Alignment</div>
                  <div style={{ height: "3px", background: "rgba(255,255,255,0.07)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", background: "var(--purple-l)", width: `${result.score * 10}%`, borderRadius: "2px", transition: "width 0.6s ease" }} />
                  </div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--t1)" }}>{result.score * 10}%</div>
              </div>
            </>
          ) : (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "40px 20px", textAlign: "center" }}>
              <CheckCircle size={28} strokeWidth={1.5} style={{ color: "var(--t3)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "var(--t2)", marginBottom: "6px" }}>Run the review</p>
              <p style={{ fontSize: "11px", color: "var(--t3)", lineHeight: 1.5 }}>Score, AI detection, and editorial notes will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
