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
      const result = await api.content.generate(topic, insights, "x") as { text: string };
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
      const result = await api.content.postNow(text, "x") as { result: { tweet_id: string } };
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
    <div className="p-8 max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>03</span>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>Generate</h2>
        </div>
        <p className="text-[13px] ml-6" style={{ color: "var(--text-muted)" }}>
          Generate a post based on your research and insights.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-5 flex flex-col gap-5">
          {/* Topic input */}
          <div>
            <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              Topic / angle
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="e.g. Why self-custody matters for active traders"
                className="flex-1 px-4 py-2.5 rounded-lg"
              />
              <button
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div>
            <label className="block text-[11px] font-medium mb-2 uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              Post
            </label>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={6}
              placeholder="Generated content will appear here. You can edit it directly."
              className="w-full px-4 py-3 rounded-lg resize-none"
            />
            <div className="flex justify-end mt-1.5">
              <span className="text-[12px] font-mono" style={{ color: overLimit ? "var(--red)" : "var(--text-muted)" }}>
                {charCount}/280
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={() => { store.setContent(text); router.push("/review"); }}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] transition-all disabled:opacity-40"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
          >
            Review <ArrowRight size={12} />
          </button>
          <button
            onClick={() => { store.setContent(text); router.push("/schedule"); }}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] transition-all disabled:opacity-40"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)" }}
          >
            Schedule <ArrowRight size={12} />
          </button>
          <button
            onClick={postNow}
            disabled={posting || !text.trim() || overLimit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40 ml-auto"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {posting ? "Posting..." : "Post now"}
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] mt-4 font-mono" style={{ color: "var(--red)" }}>{error}</p>}
      {posted && (
        <p className="text-[12px] mt-4 font-mono" style={{ color: "var(--green)" }}>
          Posted — tweet ID: {posted.tweet_id}
        </p>
      )}
    </div>
  );
}
