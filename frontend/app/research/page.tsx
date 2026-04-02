"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import { Search, ArrowRight, Loader2, ClipboardPaste, Check } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  google_trends: "Google Trends",
  coingecko:     "CoinGecko Trending",
};

export default function ResearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState<string[]>(["google_trends"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [pillars, setPillars] = useState<string[]>([]);
  const [coingeckoEnabled, setCoingeckoEnabled] = useState(false);

  // Paste research
  const [pasteText, setPasteText] = useState("");
  const [pasteQuery, setPasteQuery] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteSaved, setPasteSaved] = useState(false);

  useEffect(() => {
    const p = store.getProject();
    if (p?.content_pillars?.length) setPillars(p.content_pillars);
    if (p?.coingecko_enabled) setCoingeckoEnabled(true);
  }, []);

  function toggleSource(s: string) {
    setSources((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function run(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError("");
    if (q) setQuery(q);
    try {
      const project = store.getProject();
      const data = await api.research.run(searchQuery, sources, project?.id);
      setResults(data);
      store.setResearch(data, (data as { research_id?: number }).research_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function savePane() {
    if (!pasteText.trim()) return;
    setPasting(true); setError("");
    try {
      const project = store.getProject();
      const label = pasteQuery.trim() || "manual research";
      const res = await api.research.paste(pasteText, label, project?.id);
      store.setResearch({ query: label, data: { grok_manual: pasteText }, research_id: res.research_id }, res.research_id);
      setPasteSaved(true);
      setTimeout(() => setPasteSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPasting(false);
    }
  }

  const availableSources = ["google_trends", ...(coingeckoEnabled ? ["coingecko"] : [])];

  return (
    <div style={{ padding: "52px 64px", maxWidth: "860px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>01</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Research</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Search free sources, or paste research you gathered from Grok or anywhere else.
        </p>
      </div>

      {/* ── Search card ── */}
      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
            Search Sources
          </p>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Content pillars */}
          {pillars.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                Content pillars
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {pillars.map((pillar) => (
                  <button
                    key={pillar}
                    onClick={() => run(pillar)}
                    style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
                  >
                    {pillar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query input */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Topic or keyword
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  placeholder="e.g. crypto perps, self-custody trading"
                  style={{ width: "100%", paddingLeft: "42px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>
              <button
                onClick={() => run()}
                disabled={loading || !query.trim()}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (loading || !query.trim()) ? 0.4 : 1 }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Sources */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              Sources
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {availableSources.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSource(s)}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
                    background: sources.includes(s) ? "var(--accent-dim)" : "var(--surface-3)",
                    border: `1px solid ${sources.includes(s) ? "var(--accent-border)" : "var(--border-2)"}`,
                    color: sources.includes(s) ? "var(--accent-light)" : "var(--text-muted)",
                  }}
                >
                  {SOURCE_LABELS[s]}
                </button>
              ))}
              {!coingeckoEnabled && (
                <span style={{ fontSize: "12px", color: "var(--text-subtle)", alignSelf: "center", marginLeft: "4px" }}>
                  CoinGecko available — enable in project settings
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Paste Research card ── */}
      <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", marginBottom: "20px" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: "8px" }}>
          <ClipboardPaste size={13} style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
            Paste Research
          </p>
          <span style={{ fontSize: "11px", color: "var(--text-subtle)", marginLeft: "4px" }}>
            — paste Grok output, X threads, news, anything
          </span>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="text"
            value={pasteQuery}
            onChange={(e) => setPasteQuery(e.target.value)}
            placeholder='Label (e.g. "Grok research — crypto perps Apr 2026")'
            style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste any research text here — Grok output, copied X threads, news articles, notes..."
            style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", resize: "vertical", fontSize: "14px", lineHeight: 1.7 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={savePane}
              disabled={pasting || !pasteText.trim()}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (pasting || !pasteText.trim()) ? 0.4 : 1 }}
            >
              {pasting ? <Loader2 size={13} className="animate-spin" /> : pasteSaved ? <Check size={13} /> : <ClipboardPaste size={13} />}
              {pasting ? "Saving..." : pasteSaved ? "Saved!" : "Save as Research"}
            </button>
            {pasteSaved && (
              <button
                onClick={() => router.push("/insights")}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
              >
                Analyze insights <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: "13px", marginBottom: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}

      {/* Results */}
      {results && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Results for <strong style={{ color: "var(--text)", fontWeight: 500 }}>{(results as { query?: string }).query}</strong>
            </p>
            <button
              onClick={() => router.push("/insights")}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Analyze insights <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries((results as { data?: Record<string, unknown> }).data ?? {}).map(([source, items]) => (
              <div key={source} style={{ borderRadius: "12px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                </div>
                {Array.isArray(items) && items.length > 0 ? (
                  <div>
                    {(items as Record<string, unknown>[]).slice(0, 8).map((item, i) => (
                      <div key={i} style={{ padding: "14px 20px", fontSize: "14px", color: "var(--text-dim)", borderBottom: i < Math.min((items as unknown[]).length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                        {source === "google_trends" && <p style={{ color: "var(--text)" }}>{String(item)}</p>}
                        {source === "coingecko" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: 500, color: "var(--text)" }}>{String((item as Record<string, unknown>).name ?? "")}</span>
                            <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>{String((item as Record<string, unknown>).symbol ?? "").toUpperCase()}</span>
                            {(item as Record<string, unknown>).market_cap_rank != null && (
                              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>rank #{String((item as Record<string, unknown>).market_cap_rank)}</span>
                            )}
                          </div>
                        )}
                        {source === "telegram" && (
                          <div>
                            <p style={{ marginBottom: "4px", color: "var(--text)", lineHeight: 1.6 }}>{String((item as Record<string, unknown>).text ?? "")}</p>
                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-subtle)" }}>@{String((item as Record<string, unknown>).channel ?? "")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : typeof items === "string" ? (
                  <p style={{ padding: "16px 20px", fontSize: "14px", color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{items}</p>
                ) : (
                  <p style={{ padding: "16px 20px", fontSize: "14px", color: "var(--text-muted)" }}>No results</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
