"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, Send, Trash2, ToggleLeft, ToggleRight, PenLine, Check } from "lucide-react";
import StatusBar from "@/components/StatusBar";

type Tab = "single" | "batch";

function ContentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("single");

  const [topic, setTopic]             = useState("");
  const [text, setText]               = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading]         = useState(false);
  const [posting, setPosting]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [autoQueue, setAutoQueue]     = useState(false);
  const [error, setError]             = useState("");
  const [posted, setPosted]           = useState<{ tweet_id: string } | null>(null);
  const [savedDraft, setSavedDraft]   = useState<Draft | null>(null);

  const [batchLoading, setBatchLoading]           = useState(false);
  const [batchDrafts, setBatchDrafts]             = useState<Draft[]>([]);
  const [batchError, setBatchError]               = useState("");
  const [deletingIds, setDeletingIds]             = useState<Set<number>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds]   = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds]             = useState<Set<number>>(new Set());
  const [batchCount, setBatchCount]               = useState(15);

  const [insightsFromDB, setInsightsFromDB] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
    const proj = store.getProject();
    setProject(proj);
    const dateParam = searchParams.get("date");
    if (dateParam) setScheduledAt(`${dateParam}T09:00`);
    if (!store.getInsights()) {
      api.insights.latest(proj?.id).then((res) => {
        if (res.insights) {
          store.setInsights(res.insights);
          if (res.research_id) store.setResearchId(res.research_id);
          setInsightsFromDB(true);
        }
      }).catch(() => {});
    }
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true); setError(""); setPosted(null); setSavedDraft(null);
    try {
      const insights = store.getInsights() ?? {};
      const result = await api.content.generate(topic, insights, "x", project?.id);
      setText(result.text); store.setContent(result.text);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true); setError("");
    try {
      const result = await api.content.postNow(text, "x", project?.id) as { result: { tweet_id: string } };
      setPosted(result.result);
    } catch (e) { setError((e as Error).message); }
    finally { setPosting(false); }
  }

  async function saveDraft() {
    if (!text.trim()) return;
    setSaving(true); setError("");
    try {
      const draft = await api.content.saveDraft(text, topic || "manual", "x", project?.id, autoQueue);
      setSavedDraft(draft);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function generateBatch() {
    setBatchLoading(true); setBatchError(""); setBatchDrafts([]);
    try {
      const insights = store.getInsights() ?? {};
      const result = await api.content.batchGenerate(insights, "x", project?.id, batchCount);
      setBatchDrafts(result.drafts);
    } catch (e) { setBatchError((e as Error).message); }
    finally { setBatchLoading(false); }
  }

  async function toggleAutoQueue(draft: Draft) {
    setTogglingIds((s) => new Set(s).add(draft.id));
    try {
      const updated = await api.content.setAutoQueue(draft.id, !draft.auto_queue);
      setBatchDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, auto_queue: updated.auto_queue } : d)));
    } catch { /**/ }
    finally { setTogglingIds((s) => { const n = new Set(s); n.delete(draft.id); return n; }); }
  }

  async function deleteDraft(id: number) {
    if (!confirmDeleteIds.has(id)) { setConfirmDeleteIds((s) => new Set(s).add(id)); return; }
    setConfirmDeleteIds((s) => { const n = new Set(s); n.delete(id); return n; });
    setDeletingIds((s) => new Set(s).add(id));
    try { await api.content.deleteDraft(id); setBatchDrafts((prev) => prev.filter((d) => d.id !== id)); }
    catch { /**/ }
    finally { setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; }); }
  }

  async function enableAll() {
    for (const d of batchDrafts.filter((d) => !d.auto_queue)) await toggleAutoQueue(d);
  }

  const charCount = text.length;
  const overLimit = charCount > 280;

  /* ── Shared styles ── */
  const PILL_BTN = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
    letterSpacing: "0.4px",
    background: active ? "var(--bg-elev)" : "transparent",
    color: active ? "var(--t1)" : "var(--ti)",
    border: active ? "1px solid var(--border-2)" : "1px solid transparent",
    cursor: "pointer", transition: "all 0.15s",
  });

  const PILLAR_CARDS = project?.content_pillars?.slice(0, 2) ?? [];

  return (
    <>
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Page header + tabs ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)", fontFamily: "var(--font-manrope), sans-serif", marginBottom: "8px" }}>
            CONTENT ENGINE
          </p>
          <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1 }}>
            Generate
          </h1>
        </div>
        {/* Tab toggle in topbar style */}
        <div style={{ display: "flex", background: "var(--bg-mid)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px", gap: "2px" }}>
          {(["single", "batch"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={PILL_BTN(tab === t)}>
              {t === "single" ? "Single Post" : "Batch Week"}
            </button>
          ))}
        </div>
      </div>

      {insightsFromDB && (
        <div style={{ padding: "10px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(29,161,242,0.07)", border: "1px solid rgba(29,161,242,0.2)", fontSize: "12px", color: "var(--blue)" }}>
          Loaded from DB — using last saved insights. Run pipeline from Research for fresh data.
        </div>
      )}

      {/* ── Single post ── */}
      {tab === "single" && (
        <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: "20px" }}>

          {/* Left — topic + editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Topic input + generate */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "14px" }}>Topic / Angle</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generate()}
                  placeholder="e.g. Why self-custody matters for active traders"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={generate}
                  disabled={loading || !topic.trim()}
                  style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 20px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (loading || !topic.trim()) ? 0.45 : 1, whiteSpace: "nowrap", fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />}
                  {loading ? "Generating…" : "Synthesize"}
                </button>
              </div>
            </div>

            {/* Generated draft card */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
              {/* Gold top line */}
              <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,220,161,0.3), transparent)" }} />
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", padding: "3px 7px", borderRadius: "4px", background: "rgba(29,161,242,0.1)", color: "var(--blue)", fontWeight: 600, letterSpacing: "0.5px" }}>X / TWITTER</span>
                </div>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: overLimit ? "var(--red)" : "var(--t3)" }}>{charCount}/280</span>
              </div>
              <div style={{ padding: "18px 20px" }}>
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); store.setContent(e.target.value); }}
                  rows={7}
                  placeholder="Generated content appears here — edit freely."
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "13.5px", color: "var(--t1)", lineHeight: 1.7, resize: "none", fontFamily: "var(--font-inter), sans-serif", fontStyle: text ? "normal" : "italic" }}
                />
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={() => { store.setContent(text); router.push("/review"); }} disabled={!text.trim()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.14)", color: "var(--t1)", background: "transparent", cursor: "pointer", opacity: !text.trim() ? 0.4 : 1, letterSpacing: "0.4px" }}>
                  Review <ArrowRight size={12} />
                </button>
                <button onClick={saveDraft} disabled={saving || !text.trim()} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--t2)", cursor: "pointer", opacity: (saving || !text.trim()) ? 0.4 : 1, letterSpacing: "0.4px" }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button onClick={postNow} disabled={posting || !text.trim() || overLimit} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (posting || !text.trim() || overLimit) ? 0.45 : 1, letterSpacing: "0.4px", marginLeft: "auto" }}>
                  {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {posting ? "Posting…" : "Post now"}
                </button>
              </div>
            </div>

            {/* Auto-queue toggle + scheduled date */}
            {text.trim() && (
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <button onClick={() => setAutoQueue(!autoQueue)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--gold)" : "var(--t3)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {autoQueue ? <ToggleRight size={20} strokeWidth={1.75} /> : <ToggleLeft size={20} strokeWidth={1.75} />}
                  <span style={{ fontSize: "12px", color: autoQueue ? "var(--gold)" : "var(--t2)" }}>Auto-queue when saved</span>
                </button>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ width: "auto", fontSize: "12px", padding: "7px 11px", borderRadius: "7px" }} />
              </div>
            )}

            {error && <p style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>{error}</p>}
            {posted && <p style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--green)" }}>Posted — tweet ID: {posted.tweet_id}</p>}
            {savedDraft && <p style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--green)" }}>Saved as draft #{savedDraft.id}{savedDraft.auto_queue ? " — queued" : ""}</p>}
          </div>

          {/* Right — pillars + queue preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Active pillars */}
            {PILLAR_CARDS.length > 0 && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "12px" }}>Active Pillars</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {PILLAR_CARDS.map((pillar: string, i: number) => (
                    <button key={pillar} onClick={() => setTopic(pillar)} style={{
                      textAlign: "left", padding: "12px 14px", borderRadius: "8px", cursor: "pointer",
                      background: i === 0 ? "rgba(255,184,0,0.07)" : "rgba(107,47,217,0.07)",
                      border: `1px solid ${i === 0 ? "rgba(255,184,0,0.2)" : "rgba(107,47,217,0.2)"}`,
                      borderLeft: `3px solid ${i === 0 ? "var(--gold)" : "var(--purple-l)"}`,
                    }}>
                      <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", marginBottom: "2px" }}>{pillar}</p>
                      <p style={{ fontSize: "11px", color: "var(--t3)" }}>Click to use as topic</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Queue preview — last 3 drafts */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Queue Preview</p>
              </div>
              <div style={{ padding: "8px 0" }}>
                {savedDraft ? (
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ width: "3px", alignSelf: "stretch", background: "var(--gold)", borderRadius: "2px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--gold)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{savedDraft.topic}</p>
                      <p style={{ fontSize: "12px", color: "var(--t2)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{savedDraft.text}</p>
                    </div>
                    <Check size={12} style={{ color: "var(--green)", flexShrink: 0, marginTop: "2px" }} />
                  </div>
                ) : (
                  <p style={{ padding: "20px 16px", fontSize: "12px", color: "var(--t3)", textAlign: "center" }}>Save a draft to see it here</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch week tab ── */}
      {tab === "batch" && (
        <>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "22px", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65, marginBottom: "16px" }}>
              Generates posts distributed across your content pillars in a single Claude call. All saved as drafts.
            </p>
            {!project?.content_pillars?.length && (
              <p style={{ fontSize: "12px", color: "var(--amber)", fontFamily: "var(--font-mono), monospace", marginBottom: "16px" }}>
                No content pillars set — configure them in Projects first.
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--t2)" }}>Posts to generate</span>
                <input type="number" min={3} max={30} value={batchCount} onChange={(e) => setBatchCount(Math.max(3, Math.min(30, parseInt(e.target.value) || 15)))} style={{ width: "64px", textAlign: "center", fontSize: "13px" }} />
              </div>
              <button onClick={generateBatch} disabled={batchLoading || !project?.content_pillars?.length} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 22px", borderRadius: "8px", fontSize: "11.5px", fontWeight: 700, background: "var(--gold)", color: "#1a1000", border: "none", cursor: "pointer", opacity: (batchLoading || !project?.content_pillars?.length) ? 0.45 : 1, fontFamily: "var(--font-manrope), sans-serif" }}>
                {batchLoading && <Loader2 size={13} className="animate-spin" />}
                {batchLoading ? "Generating…" : `Generate ${batchCount} drafts`}
              </button>
            </div>
          </div>

          {batchError && <p style={{ fontSize: "12px", marginBottom: "16px", fontFamily: "var(--font-mono), monospace", color: "var(--red)" }}>{batchError}</p>}

          {batchDrafts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "var(--t2)" }}>{batchDrafts.length} drafts · {batchDrafts.filter((d) => d.auto_queue).length} queued</span>
                <button onClick={enableAll} style={{ fontSize: "11px", padding: "5px 14px", borderRadius: "8px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--gold)", cursor: "pointer", fontWeight: 600, letterSpacing: "0.4px" }}>
                  Queue all
                </button>
              </div>
              {batchDrafts.map((draft, idx) => (
                <div key={draft.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
                  {idx === 0 && <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,220,161,0.3), transparent)" }} />}
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--t3)", display: "block", marginBottom: "6px" }}>{draft.topic}</span>
                      <p style={{ fontSize: "13px", color: "var(--t1)", lineHeight: 1.6 }}>{draft.text}</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button onClick={() => toggleAutoQueue(draft)} disabled={togglingIds.has(draft.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: draft.auto_queue ? "var(--gold)" : "var(--t3)", opacity: togglingIds.has(draft.id) ? 0.4 : 1 }}>
                        {draft.auto_queue ? <ToggleRight size={18} strokeWidth={1.75} /> : <ToggleLeft size={18} strokeWidth={1.75} />}
                      </button>
                      <button onClick={() => deleteDraft(draft.id)} disabled={deletingIds.has(draft.id)} style={{ background: confirmDeleteIds.has(draft.id) ? "rgba(239,68,68,0.08)" : "none", border: confirmDeleteIds.has(draft.id) ? "1px solid rgba(239,68,68,0.2)" : "none", borderRadius: "6px", cursor: "pointer", padding: "4px 8px", color: confirmDeleteIds.has(draft.id) ? "var(--red)" : "var(--t3)", fontSize: "10px", fontWeight: 600, opacity: deletingIds.has(draft.id) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                        {confirmDeleteIds.has(draft.id) ? "Delete?" : <Trash2 size={14} strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: draft.text.length > 280 ? "var(--red)" : "var(--t3)" }}>{draft.text.length}/280</span>
                    {draft.auto_queue && <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--gold)", fontWeight: 600 }}>queued</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    <StatusBar />
    </>
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentPageInner />
    </Suspense>
  );
}
