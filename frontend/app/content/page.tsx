"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, Draft } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, Send, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type Tab = "single" | "batch";

export default function ContentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");

  // ── Single post state ────────────────────────────────────────────────────
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoQueue, setAutoQueue] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState<{ tweet_id: string } | null>(null);
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);

  // ── Batch state ──────────────────────────────────────────────────────────
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchDrafts, setBatchDrafts] = useState<Draft[]>([]);
  const [batchError, setBatchError] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [batchCount, setBatchCount] = useState(15);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
    setProject(store.getProject());
  }, []);

  // ── Single post handlers ─────────────────────────────────────────────────

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setPosted(null);
    setSavedDraft(null);
    try {
      const insights = store.getInsights() ?? {};
      const result = await api.content.generate(topic, insights, "x", project?.id);
      setText(result.text);
      store.setContent(result.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function postNow() {
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      const result = await api.content.postNow(text, "x", project?.id) as { result: { tweet_id: string } };
      setPosted(result.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function saveDraft() {
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      const draft = await api.content.saveDraft(text, topic || "manual", "x", project?.id, autoQueue);
      setSavedDraft(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleTextChange(val: string) {
    setText(val);
    store.setContent(val);
  }

  // ── Batch handlers ───────────────────────────────────────────────────────

  async function generateBatch() {
    setBatchLoading(true);
    setBatchError("");
    setBatchDrafts([]);
    try {
      const insights = store.getInsights() ?? {};
      const result = await api.content.batchGenerate(insights, "x", project?.id, batchCount);
      setBatchDrafts(result.drafts);
    } catch (e) {
      setBatchError((e as Error).message);
    } finally {
      setBatchLoading(false);
    }
  }

  async function toggleAutoQueue(draft: Draft) {
    setTogglingIds((s) => new Set(s).add(draft.id));
    try {
      const updated = await api.content.setAutoQueue(draft.id, !draft.auto_queue);
      setBatchDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? { ...d, auto_queue: updated.auto_queue } : d))
      );
    } catch {
      /* ignore */
    } finally {
      setTogglingIds((s) => { const n = new Set(s); n.delete(draft.id); return n; });
    }
  }

  async function deleteDraft(id: number) {
    setDeletingIds((s) => new Set(s).add(id));
    try {
      await api.content.deleteDraft(id);
      setBatchDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function enableAll() {
    for (const d of batchDrafts.filter((d) => !d.auto_queue)) {
      await toggleAutoQueue(d);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const charCount = text.length;
  const overLimit = charCount > 280;

  return (
    <div style={{ padding: "52px 64px", maxWidth: "800px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>03</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Generate</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Generate a post or a full week of drafts.
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {(["single", "batch"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
              background: tab === t ? "var(--surface-3)" : "transparent",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
              border: tab === t ? "1px solid var(--border-2)" : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {t === "single" ? "Single post" : "Batch week"}
          </button>
        ))}
      </div>

      {/* ── Single post tab ── */}
      {tab === "single" && (
        <>
          <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Topic input */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                  Topic / angle
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generate()}
                    placeholder="e.g. Why self-custody matters for active traders"
                    style={{ flex: 1, padding: "12px 16px", borderRadius: "10px", fontSize: "14px" }}
                  />
                  <button
                    onClick={generate}
                    disabled={loading || !topic.trim()}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (loading || !topic.trim()) ? 0.4 : 1, transition: "opacity 0.15s", whiteSpace: "nowrap" }}
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                  Post
                </label>
                <textarea
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  rows={7}
                  placeholder="Generated content will appear here. You can edit it directly."
                  style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", resize: "none", fontSize: "14px", lineHeight: 1.7 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: overLimit ? "var(--red)" : "var(--text-muted)" }}>
                    {charCount}/280
                  </span>
                </div>
              </div>

              {/* Auto-queue toggle */}
              {text.trim() && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => setAutoQueue(!autoQueue)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: autoQueue ? "var(--accent)" : "var(--text-muted)", display: "flex", alignItems: "center" }}
                  >
                    {autoQueue ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>
                    Add to auto-queue when saved
                  </span>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding: "16px 28px", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <button
                onClick={() => { store.setContent(text); router.push("/review"); }}
                disabled={!text.trim()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: !text.trim() ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                Review <ArrowRight size={13} />
              </button>
              <button
                onClick={() => { store.setContent(text); router.push("/schedule"); }}
                disabled={!text.trim()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: !text.trim() ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                Schedule <ArrowRight size={13} />
              </button>
              <button
                onClick={saveDraft}
                disabled={saving || !text.trim()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: (saving || !text.trim()) ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {saving ? "Saving..." : "Save draft"}
              </button>
              <button
                onClick={postNow}
                disabled={posting || !text.trim() || overLimit}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (posting || !text.trim() || overLimit) ? 0.4 : 1, transition: "opacity 0.15s", marginLeft: "auto" }}
              >
                {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {posting ? "Posting..." : "Post now"}
              </button>
            </div>
          </div>

          {error && <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}
          {posted && (
            <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--green)" }}>
              Posted — tweet ID: {posted.tweet_id}
            </p>
          )}
          {savedDraft && (
            <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--green)" }}>
              Saved as draft #{savedDraft.id}{savedDraft.auto_queue ? " — added to auto-queue" : ""}
            </p>
          )}
        </>
      )}

      {/* ── Batch week tab ── */}
      {tab === "batch" && (
        <>
          <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "24px" }}>
            <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Generates posts distributed across your project&apos;s content pillars in a single Claude call. All saved as drafts.
                </p>
                {!project?.content_pillars?.length && (
                  <p style={{ fontSize: "13px", color: "var(--yellow)", marginTop: "8px", fontFamily: "monospace" }}>
                    No content pillars set — configure them in Project Settings first.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label style={{ fontSize: "13px", color: "var(--text-muted)" }}>Posts to generate</label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(3, Math.min(30, parseInt(e.target.value) || 15)))}
                    style={{ width: "70px", padding: "8px 12px", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}
                  />
                </div>
                <button
                  onClick={generateBatch}
                  disabled={batchLoading || !project?.content_pillars?.length}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (batchLoading || !project?.content_pillars?.length) ? 0.4 : 1, transition: "opacity 0.15s" }}
                >
                  {batchLoading && <Loader2 size={14} className="animate-spin" />}
                  {batchLoading ? "Generating..." : `Generate ${batchCount} drafts`}
                </button>
              </div>
            </div>
          </div>

          {batchError && <p style={{ fontSize: "13px", marginBottom: "16px", fontFamily: "monospace", color: "var(--red)" }}>{batchError}</p>}

          {batchDrafts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Bulk actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  {batchDrafts.length} drafts · {batchDrafts.filter((d) => d.auto_queue).length} queued
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={enableAll}
                    style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "8px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
                  >
                    Queue all
                  </button>
                </div>
              </div>

              {batchDrafts.map((draft) => (
                <div
                  key={draft.id}
                  style={{ borderRadius: "12px", padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", display: "block", marginBottom: "6px" }}>
                        {draft.topic}
                      </span>
                      <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{draft.text}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => toggleAutoQueue(draft)}
                        disabled={togglingIds.has(draft.id)}
                        title={draft.auto_queue ? "Remove from auto-queue" : "Add to auto-queue"}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: draft.auto_queue ? "var(--accent)" : "var(--text-muted)", opacity: togglingIds.has(draft.id) ? 0.4 : 1 }}
                      >
                        {draft.auto_queue ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => deleteDraft(draft.id)}
                        disabled={deletingIds.has(draft.id)}
                        title="Delete draft"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-muted)", opacity: deletingIds.has(draft.id) ? 0.4 : 1 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", fontFamily: "monospace", color: draft.text.length > 280 ? "var(--red)" : "var(--text-subtle)" }}>
                      {draft.text.length}/280
                    </span>
                    {draft.auto_queue && (
                      <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "var(--accent-dim, var(--blue-dim))", border: "1px solid var(--blue-border)", color: "var(--blue)", fontWeight: 500 }}>
                        queued
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
