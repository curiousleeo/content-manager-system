"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, ArrowRight, Send } from "lucide-react";

export default function ContentPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState<{ tweet_id: string } | null>(null);

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const insights = store.getInsights() ?? {};
      const project = store.getProject();
      const result = await api.content.generate(topic, insights, "x", project?.id) as { text: string };
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
      const project = store.getProject();
      const result = await api.content.postNow(text, "x", project?.id) as { result: { tweet_id: string } };
      setPosted(result.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  }

  function handleTextChange(val: string) {
    setText(val);
    store.setContent(val);
  }

  const charCount = text.length;
  const overLimit = charCount > 280;

  return (
    <div style={{ padding: "52px 64px", maxWidth: "760px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>03</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Generate</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Generate a post based on your research and insights.
        </p>
      </div>

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
    </div>
  );
}
