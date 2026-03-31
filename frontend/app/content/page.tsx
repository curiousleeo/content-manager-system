"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

export default function ContentPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState<{ tweet_id: string } | null>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    const saved = store.getContent();
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

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

  const overLimit = charCount > 280;

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">03 — Generate</h2>
      <p className="text-zinc-500 text-sm mb-8">
        Generate a post based on your research and insights.
      </p>

      {/* Topic */}
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Topic / angle
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. Why self-custody matters for active traders"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="mb-3">
        <label className="block text-xs text-zinc-600 font-mono mb-2 uppercase tracking-wide">
          Post
        </label>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={6}
          placeholder="Generated content will appear here. You can edit it directly."
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
        <div className="flex justify-end">
          <span className={`text-xs font-mono ${overLimit ? "text-red-400" : "text-zinc-600"}`}>
            {charCount}/280
          </span>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 font-mono">{error}</p>}
      {posted && (
        <p className="text-green-400 text-sm mb-4 font-mono">
          Posted — tweet ID: {posted.tweet_id}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            store.setContent(text);
            router.push("/review");
          }}
          disabled={!text.trim()}
          className="px-5 py-2.5 border border-zinc-600 text-sm rounded hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Review →
        </button>
        <button
          onClick={() => {
            store.setContent(text);
            router.push("/schedule");
          }}
          disabled={!text.trim()}
          className="px-5 py-2.5 border border-zinc-600 text-sm rounded hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Schedule →
        </button>
        <button
          onClick={postNow}
          disabled={posting || !text.trim() || overLimit}
          className="ml-auto px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {posting ? "Posting..." : "Post now"}
        </button>
      </div>
    </div>
  );
}
