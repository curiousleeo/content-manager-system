"use client";

import { useState, useEffect } from "react";
import { api, NicheReportData, CacheStatusItem, CachedTweetAccount, PersonalAuditData, TweetReview } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Heart, MessageCircle, Repeat2 } from "lucide-react";

const CATEGORIES = ["competitor", "kol", "ecosystem"] as const;
type Category = typeof CATEGORIES[number];

const categoryColors: Record<Category, { color: string; bg: string }> = {
  competitor: { color: "var(--red)",    bg: "rgba(239,68,68,0.1)"    },
  kol:        { color: "var(--gold)",   bg: "rgba(255,184,0,0.1)"    },
  ecosystem:  { color: "var(--green)",  bg: "rgba(34,197,94,0.1)"    },
};

const cacheStatusColors: Record<CacheStatusItem["status"], { color: string; icon: React.ReactNode }> = {
  never_fetched: { color: "var(--gold)",   icon: <AlertCircle size={12} /> },
  stale:         { color: "var(--gold)",   icon: <AlertCircle size={12} /> },
  cached:        { color: "var(--green)",  icon: <CheckCircle2 size={12} /> },
  fetched_today: { color: "var(--t3)",     icon: <CheckCircle2 size={12} /> },
};

const reportStatusConfig: Record<NicheReportData["status"], { label: string; color: string; bg: string }> = {
  pending:   { label: "Pending",  color: "var(--gold)",   bg: "rgba(255,184,0,0.1)"    },
  injected:  { label: "Injected", color: "var(--green)",  bg: "rgba(34,197,94,0.1)"    },
  discarded: { label: "Archived", color: "var(--t3)",     bg: "rgba(255,255,255,0.05)" },
};

const effectivenessConfig: Record<string, { color: string; bg: string }> = {
  high:   { color: "var(--green)", bg: "rgba(34,197,94,0.12)"   },
  medium: { color: "var(--gold)",  bg: "rgba(255,184,0,0.12)"   },
  low:    { color: "var(--t3)",    bg: "rgba(255,255,255,0.05)" },
};

interface Account { id: number; x_handle: string; category: string; added_at: string; fetched_at: string | null; }

type RunStep = "idle" | "preview" | "running";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function NichePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState<Category>("competitor");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [adding, setAdding] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatusItem[]>([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [apiCallsNeeded, setApiCallsNeeded] = useState(0);
  const [runStep, setRunStep] = useState<RunStep>("idle");
  const [manualReport, setManualReport] = useState<NicheReportData | null>(null);
  const [fetchSummary, setFetchSummary] = useState<{ handle: string; used_cache: boolean; posts_count: number }[]>([]);
  const [allReports, setAllReports] = useState<NicheReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [injectingId, setInjectingId] = useState<number | null>(null);
  const [discardingId, setDiscardingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [tweetVault, setTweetVault] = useState<CachedTweetAccount[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [audit, setAudit] = useState<PersonalAuditData | null>(null);
  const [auditStep, setAuditStep] = useState<"idle" | "fetching" | "analyzing" | "pasting">("idle");
  const [auditError, setAuditError] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedTweets, setPastedTweets] = useState("");

  const project = store.getProject();
  const projectId = project?.id;

  const latestReport = allReports[0] ?? manualReport ?? null;

  useEffect(() => {
    if (!projectId) { setLoadingAccounts(false); setLoadingReports(false); return; }
    loadAccounts();
    loadAllReports();
    loadTweetVault();
    loadLatestAudit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadAccounts() {
    if (!projectId) return;
    try {
      const res = await api.niche.listAccounts(projectId);
      setAccounts(res.accounts);
    } catch { /* ignore */ }
    finally { setLoadingAccounts(false); }
  }

  async function loadAllReports() {
    if (!projectId) return;
    try {
      const res = await api.niche.allReports(projectId);
      setAllReports(res.reports);
    } catch { /* ignore */ }
    finally { setLoadingReports(false); }
  }

  async function loadLatestAudit() {
    if (!projectId) return;
    try {
      const res = await api.niche.latestAudit(projectId);
      if (res.audit) setAudit(res.audit);
    } catch { /* ignore */ }
  }

  async function runAudit() {
    if (!projectId) return;
    setAuditError("");
    setAuditStep("fetching");
    try {
      const fetchRes = await api.niche.fetchPersonalTweets(projectId);
      setAuditStep("analyzing");
      const auditRes = await api.niche.analyzeAudit(fetchRes.audit_id);
      setAudit(auditRes);
    } catch (e) { setAuditError((e as Error).message); }
    finally { setAuditStep("idle"); }
  }

  async function runPasteAudit() {
    if (!projectId || !pastedTweets.trim()) return;
    setAuditError("");
    setAuditStep("pasting");
    try {
      const auditRes = await api.niche.pasteAndAudit(projectId, pastedTweets);
      setAudit(auditRes);
      setPasteMode(false);
      setPastedTweets("");
    } catch (e) { setAuditError((e as Error).message); }
    finally { setAuditStep("idle"); }
  }

  async function loadTweetVault() {
    if (!projectId) return;
    try {
      const res = await api.niche.cachedTweets(projectId);
      setTweetVault(res.accounts);
    } catch { /* ignore */ }
  }

  async function addAccount() {
    if (!handle.trim() || !projectId) return;
    setAdding(true); setError("");
    try {
      await api.niche.addAccount(projectId, handle.trim(), category);
      setHandle("");
      await loadAccounts();
    } catch (e) { setError((e as Error).message); }
    finally { setAdding(false); }
  }

  async function removeAccount(id: number) {
    try {
      await api.niche.removeAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) { setError((e as Error).message); }
  }

  async function previewRun() {
    if (!projectId) return;
    setError("");
    try {
      const res = await api.niche.cacheStatus(projectId);
      setCacheStatus(res.accounts);
      setEstimatedCost(res.estimated_cost_usd);
      setApiCallsNeeded(res.api_calls_needed);
      setRunStep("preview");
    } catch (e) { setError((e as Error).message); }
  }

  async function confirmRun(force: boolean) {
    if (!projectId) return;
    setRunStep("running"); setError("");
    try {
      const result = await api.niche.runReport(projectId, force);
      setManualReport(result as NicheReportData);
      setFetchSummary((result as NicheReportData & { fetch_summary: typeof fetchSummary }).fetch_summary ?? []);
      setAllReports((prev) => [result as NicheReportData, ...prev]);
      setRunStep("idle");
      await loadTweetVault();
    } catch (e) {
      setError((e as Error).message);
      setRunStep("idle");
    }
  }

  async function injectReport(id: number) {
    setInjectingId(id);
    try {
      await api.niche.inject(id);
      setAllReports((prev) =>
        prev.map((r) => {
          if (r.id === id) return { ...r, status: "injected" };
          if (r.status === "injected") return { ...r, status: "discarded" };
          return r;
        })
      );
      if (manualReport?.id === id) setManualReport({ ...manualReport, status: "injected" });
    } catch (e) { setError((e as Error).message); }
    finally { setInjectingId(null); }
  }

  async function discardReport(id: number) {
    setDiscardingId(id);
    try {
      await api.niche.discard(id);
      setAllReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "discarded" } : r));
      if (manualReport?.id === id) setManualReport({ ...manualReport, status: "discarded" });
    } catch (e) { setError((e as Error).message); }
    finally { setDiscardingId(null); }
  }

  // Count cached tweets per account for badge
  const tweetCounts: Record<string, number> = {};
  for (const a of tweetVault) tweetCounts[a.handle] = a.count;

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
          PORTAL / Niche Intelligence
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
          Competitor <span style={{ color: "var(--gold)" }}>Vault</span>
        </h1>
      </div>

      {!projectId ? (
        <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "48px 32px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--t3)" }}>Select a project to use Niche Intelligence.</p>
        </div>
      ) : (
        <>
          {/* ── Surveillance Table ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 60px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
              {["#", "Handle", "Category", "Last Fetched", "Status", "Tweets", "Action", ""].map((h, i) => (
                <span key={i} style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>{h}</span>
              ))}
            </div>

            {/* Add row */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 60px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,184,0,0.02)" }}>
              <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>+</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAccount()}
                placeholder="@handle"
                style={{ padding: "7px 10px", borderRadius: "6px", fontSize: "12px", background: "var(--bg-mid)", color: "var(--t1)", outline: "none", marginRight: "8px", border: "none" }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={{ padding: "7px 8px", borderRadius: "6px", fontSize: "11px", background: "var(--bg-mid)", color: "var(--t2)", outline: "none", border: "none" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <span /><span /><span />
              <button
                onClick={addAccount}
                disabled={adding || !handle.trim()}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: "pointer", opacity: (adding || !handle.trim()) ? 0.4 : 1 }}
              >
                {adding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                Add
              </button>
              <span />
            </div>

            {/* Account rows */}
            {loadingAccounts ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--t3)" }} />
              </div>
            ) : accounts.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--t3)" }}>No accounts tracked. Add a competitor above.</p>
              </div>
            ) : (
              accounts.map((acc, idx) => {
                const cat = acc.category as Category;
                const c = categoryColors[cat] ?? categoryColors.competitor;
                const daysAgo = acc.fetched_at
                  ? Math.round((Date.now() - new Date(acc.fetched_at).getTime()) / 86400000)
                  : null;
                const count = tweetCounts[acc.x_handle] ?? null;
                return (
                  <div key={acc.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 60px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>{idx + 1}</span>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--t1)", fontWeight: 500 }}>@{acc.x_handle}</span>
                    <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "5px", background: c.bg, color: c.color, fontWeight: 600, width: "fit-content" }}>{acc.category}</span>
                    <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                      {daysAgo !== null ? (daysAgo === 0 ? "today" : `${daysAgo}d ago`) : "never"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: acc.fetched_at ? "var(--green)" : "var(--t3)" }} />
                      <span style={{ fontSize: "10px", color: "var(--t3)" }}>{acc.fetched_at ? "cached" : "pending"}</span>
                    </div>
                    {/* Tweet count badge */}
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: count ? "var(--t2)" : "var(--t3)" }}>
                      {count !== null ? count : "—"}
                    </span>
                    <button
                      onClick={previewRun}
                      disabled={runStep !== "idle"}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 500, background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)", color: "var(--gold)", cursor: "pointer", opacity: runStep !== "idle" ? 0.4 : 1 }}
                    >
                      <RefreshCw size={9} />
                      Fetch
                    </button>
                    <button
                      onClick={() => removeAccount(acc.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: "4px", display: "flex", alignItems: "center" }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })
            )}

            {/* Run report footer */}
            {accounts.length > 0 && runStep === "idle" && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                  {accounts.length} account{accounts.length !== 1 ? "s" : ""} under surveillance
                </span>
                <button
                  onClick={previewRun}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "var(--bg-card)", color: "var(--t2)", cursor: "pointer", fontFamily: "var(--font-manrope)", border: "none" }}
                >
                  <RefreshCw size={11} />
                  Run Full Report
                </button>
              </div>
            )}
          </div>

          {/* ── Cost preview ── */}
          {runStep === "preview" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,184,0,0.2)", borderRadius: "14px", padding: "22px", marginBottom: "20px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", marginBottom: "16px" }}>Cost Preview</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {cacheStatus.map((s) => {
                  const col = cacheStatusColors[s.status];
                  return (
                    <div key={s.handle} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "var(--bg-mid)" }}>
                      <span style={{ color: col.color }}>{col.icon}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--t1)", fontFamily: "var(--font-mono)" }}>@{s.handle}</span>
                        <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "8px", background: apiCallsNeeded > 0 ? "rgba(255,184,0,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${apiCallsNeeded > 0 ? "rgba(255,184,0,0.25)" : "rgba(34,197,94,0.25)"}`, marginBottom: "14px" }}>
                <p style={{ fontSize: "13px", fontWeight: 500, color: apiCallsNeeded > 0 ? "var(--gold)" : "var(--green)" }}>
                  {apiCallsNeeded === 0 ? "All cached — this run is free" : `${apiCallsNeeded} X API call${apiCallsNeeded > 1 ? "s" : ""} — est. $${estimatedCost.toFixed(2)}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => confirmRun(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: "pointer", fontFamily: "var(--font-manrope)" }}>
                  {apiCallsNeeded === 0 ? "Run (use cache)" : `Run — spend $${estimatedCost.toFixed(2)}`}
                </button>
                {apiCallsNeeded > 0 && (
                  <button onClick={() => confirmRun(true)} style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-mid)", color: "var(--t2)", cursor: "pointer", border: "none" }}>
                    Force re-fetch
                  </button>
                )}
                <button onClick={() => setRunStep("idle")} style={{ padding: "10px 16px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-card)", color: "var(--t3)", cursor: "pointer", border: "none" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {runStep === "running" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", background: "var(--bg-card)", borderRadius: "14px", marginBottom: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                <Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} />
                <p style={{ fontSize: "13px", color: "var(--t3)" }}>Scraping and analysing…</p>
              </div>
            </div>
          )}

          {/* ── Main two-column layout ── */}
          <div style={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: "16px", marginBottom: "20px" }}>

            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Hook Patterns */}
              <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>Hook Patterns</p>
                  <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: "2px" }}>Opening lines that drive engagement in your niche</p>
                </div>
                {!latestReport?.hook_patterns?.length ? (
                  <div style={{ padding: "24px", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "var(--t3)" }}>Run a report to see hook patterns.</p>
                  </div>
                ) : (
                  latestReport.hook_patterns.slice(0, 6).map((h, i) => {
                    const eff = h.effectiveness?.toLowerCase() ?? "low";
                    const effStyle = effectivenessConfig[eff] ?? effectivenessConfig.low;
                    return (
                      <div key={i} style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--t1)", textTransform: "capitalize" }}>
                            {String(h.type ?? "").replace(/_/g, " ")}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>×{h.frequency}</span>
                            <span style={{ fontSize: "8px", padding: "2px 7px", borderRadius: "4px", fontWeight: 700, textTransform: "uppercase", background: effStyle.bg, color: effStyle.color }}>
                              {eff}
                            </span>
                          </div>
                        </div>
                        {h.example && (
                          <p style={{ fontSize: "11px", color: "var(--t3)", lineHeight: 1.4, fontStyle: "italic", borderLeft: `2px solid ${effStyle.color}`, paddingLeft: "8px" }}>
                            "{String(h.example).slice(0, 100)}{String(h.example).length > 100 ? "…" : ""}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dominant Tone */}
              <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "18px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "10px" }}>Dominant Tone</p>
                {latestReport?.dominant_tone ? (
                  <>
                    <p style={{ fontSize: "16px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", textTransform: "capitalize", marginBottom: "8px", lineHeight: 1.3 }}>
                      {latestReport.dominant_tone}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--t3)" }}>
                      From {latestReport.accounts_analyzed} account{latestReport.accounts_analyzed !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontWeight: 500, background: reportStatusConfig[latestReport.status].bg, color: reportStatusConfig[latestReport.status].color }}>
                        {reportStatusConfig[latestReport.status].label}
                      </span>
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--t3)" }}>No data yet.</p>
                )}

                {latestReport?.post_formats?.length > 0 && (
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "8px" }}>Top Formats</p>
                    {latestReport.post_formats.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "11px", color: "var(--t2)", textTransform: "capitalize" }}>{String(f.format ?? "").replace(/_/g, " ")}</span>
                          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>×{f.frequency}</span>
                        </div>
                        {f.best_for && (
                          <p style={{ fontSize: "10px", color: "var(--t3)", margin: 0 }}>Best for: {String(f.best_for)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reports list */}
              {allReports.length > 0 && (
                <div style={{ background: "var(--bg-card)", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>
                      Reports ({allReports.length})
                    </span>
                    <button onClick={loadAllReports} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: "10px" }}>
                      <RefreshCw size={9} />
                    </button>
                  </div>
                  {(loadingReports ? [] : allReports).map((r, i) => (
                    <div key={r.id} style={{ padding: "9px 14px", borderBottom: i < allReports.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "var(--t1)", fontFamily: "var(--font-mono)" }}>
                        {new Date(r.report_date).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: reportStatusConfig[r.status].bg, color: reportStatusConfig[r.status].color }}>
                        {reportStatusConfig[r.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column — Swipe Intelligence */}
            <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>Swipe Intelligence</p>
                  <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>Best-performing posts — study the structure, not just the content</p>
                </div>
                {latestReport?.status === "pending" && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => injectReport(latestReport.id)}
                      disabled={injectingId === latestReport.id}
                      style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "#fff", color: "#000", border: "none", cursor: "pointer", opacity: injectingId === latestReport.id ? 0.4 : 1 }}
                    >
                      {injectingId === latestReport.id ? <Loader2 size={11} className="animate-spin" /> : "Inject"}
                    </button>
                    <button
                      onClick={() => discardReport(latestReport.id)}
                      disabled={discardingId === latestReport.id}
                      style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", color: "var(--t3)", cursor: "pointer", border: "none", opacity: discardingId === latestReport.id ? 0.4 : 1 }}
                    >
                      {discardingId === latestReport.id ? <Loader2 size={11} className="animate-spin" /> : "Discard"}
                    </button>
                  </div>
                )}
                {latestReport?.status === "injected" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
                    <CheckCircle2 size={13} color="var(--green)" />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--green)" }}>Active — influencing content generation</span>
                  </div>
                )}
              </div>

              {!latestReport?.swipe_file?.length ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "6px" }}>No swipe intelligence yet.</p>
                  <p style={{ fontSize: "12px", color: "var(--t3)" }}>Add accounts and run a report to unlock insights.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {latestReport.swipe_file.map((ex, i) => {
                    // Try to find the tweet ID by matching text to vault
                    const vaultAcc = tweetVault.find(a => a.handle === ex.handle);
                    const matchedTweet = vaultAcc?.tweets.find(t => t.text.slice(0, 60) === String(ex.text ?? "").slice(0, 60));
                    const tweetUrl = matchedTweet ? `https://x.com/${ex.handle}/status/${matchedTweet.id}` : null;

                    return (
                      <div
                        key={i}
                        style={{
                          padding: "18px 20px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          background: i % 4 < 2
                            ? "linear-gradient(135deg, rgba(255,184,0,0.04) 0%, transparent 60%)"
                            : "linear-gradient(135deg, rgba(107,47,217,0.06) 0%, transparent 60%)",
                        }}
                      >
                        {/* Handle + hook type + link */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: 600 }}>@{ex.handle}</span>
                          {ex.hook_type && (
                            <span style={{ fontSize: "8px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--t3)", textTransform: "capitalize" }}>
                              {String(ex.hook_type).replace(/_/g, " ")}
                            </span>
                          )}
                          {tweetUrl && (
                            <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "var(--t3)", textDecoration: "none" }}>
                              <ExternalLink size={9} />
                              View
                            </a>
                          )}
                        </div>

                        {/* Tweet text */}
                        <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--t1)", marginBottom: "8px", whiteSpace: "pre-line" }}>{String(ex.text ?? "")}</p>

                        {/* Engagement stats from vault */}
                        {matchedTweet && (
                          <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                              <Heart size={9} /> {fmt(matchedTweet.likes)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                              <MessageCircle size={9} /> {fmt(matchedTweet.replies)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                              <Repeat2 size={9} /> {fmt(matchedTweet.retweets)}
                            </span>
                          </div>
                        )}

                        {/* Why it works */}
                        {ex.why && (
                          <p style={{ fontSize: "11px", color: "var(--t3)", fontStyle: "italic", lineHeight: 1.4, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "8px" }}>
                            {String(ex.why)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Key Takeaways */}
              {latestReport?.top_insights?.length > 0 && (
                <div style={{ padding: "18px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "12px" }}>Key Takeaways</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {latestReport.top_insights.map((insight, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--gold)", background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.2)", borderRadius: "4px", padding: "1px 6px", flexShrink: 0, marginTop: "1px" }}>
                          {i + 1}
                        </span>
                        <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--t2)", margin: 0 }}>{String(insight)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tweet Vault ── */}
          {tweetVault.some(a => a.count > 0) && (
            <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
              <button
                onClick={() => setVaultOpen(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--bg-mid)", border: "none", cursor: "pointer", borderBottom: vaultOpen ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>Tweet Vault</p>
                  <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                    {tweetVault.reduce((s, a) => s + a.count, 0)} tweets across {tweetVault.filter(a => a.count > 0).length} accounts
                  </span>
                </div>
                {vaultOpen ? <ChevronDown size={14} color="var(--t3)" /> : <ChevronRight size={14} color="var(--t3)" />}
              </button>

              {vaultOpen && (
                <div>
                  {/* Account tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)", overflowX: "auto" }}>
                    {tweetVault.filter(a => a.count > 0).map(a => (
                      <button
                        key={a.handle}
                        onClick={() => setExpandedAccount(expandedAccount === a.handle ? null : a.handle)}
                        style={{
                          padding: "10px 18px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: 500,
                          background: expandedAccount === a.handle ? "var(--bg-card)" : "transparent",
                          color: expandedAccount === a.handle ? "var(--gold)" : "var(--t3)",
                          borderBottom: expandedAccount === a.handle ? "2px solid var(--gold)" : "2px solid transparent",
                        }}
                      >
                        @{a.handle} <span style={{ fontSize: "10px", opacity: 0.6 }}>({a.count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Tweet list for selected account */}
                  {expandedAccount && (() => {
                    const acc = tweetVault.find(a => a.handle === expandedAccount);
                    if (!acc) return null;
                    return (
                      <div style={{ maxHeight: "480px", overflowY: "auto" }}>
                        {acc.tweets.map((t, i) => (
                          <div key={t.id || i} style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--t1)", margin: 0, whiteSpace: "pre-line" }}>{t.text}</p>
                              <div style={{ display: "flex", gap: "14px", marginTop: "8px" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                  <Heart size={10} /> {fmt(t.likes)}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                  <MessageCircle size={10} /> {fmt(t.replies)}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                  <Repeat2 size={10} /> {fmt(t.retweets)}
                                </span>
                                {t.impressions > 0 && (
                                  <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                    {fmt(t.impressions)} views
                                  </span>
                                )}
                              </div>
                            </div>
                            {t.id && (
                              <a
                                href={`https://x.com/${acc.handle}/status/${t.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t3)", textDecoration: "none", flexShrink: 0, padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}
                              >
                                <ExternalLink size={10} />
                                Open
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Fetch summary */}
          {fetchSummary.length > 0 && runStep === "idle" && (
            <div style={{ borderRadius: "10px", overflow: "hidden", background: "var(--bg-card)", marginBottom: "16px" }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Last run summary</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1px" }}>
                {fetchSummary.map((s, i) => (
                  <div key={i} style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: "11px", color: "var(--t1)", fontFamily: "var(--font-mono)" }}>@{s.handle}</span>
                    <span style={{ fontSize: "10px", color: s.used_cache ? "var(--green)" : "var(--gold)" }}>
                      {s.used_cache ? "cache" : "fetched"} · {s.posts_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--red)" }}>{error}</p>}

          {/* ── Tweet Audit ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden", marginTop: "20px" }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>
                  Tweet Audit <span style={{ fontSize: "10px", fontWeight: 400, color: "var(--t3)", marginLeft: "8px" }}>Your tweets vs niche benchmark</span>
                </p>
                <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "3px" }}>
                  Strict comparison — finds real flaws, rewrites only what needs fixing
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => { setPasteMode(!pasteMode); setAuditError(""); }}
                  disabled={auditStep !== "idle"}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: pasteMode ? "rgba(255,184,0,0.15)" : "var(--bg-mid)", color: pasteMode ? "var(--gold)" : "var(--t2)", border: `1px solid ${pasteMode ? "rgba(255,184,0,0.4)" : "var(--border)"}`, cursor: "pointer", fontFamily: "var(--font-manrope)" }}
                >
                  Paste Tweets
                </button>
                <button
                  onClick={runAudit}
                  disabled={auditStep !== "idle"}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: auditStep !== "idle" ? "not-allowed" : "pointer", opacity: auditStep !== "idle" ? 0.6 : 1, fontFamily: "var(--font-manrope)" }}
                >
                  {auditStep === "fetching" && <><Loader2 size={11} className="animate-spin" /> Fetching…</>}
                  {auditStep === "analyzing" && <><Loader2 size={11} className="animate-spin" /> Analysing…</>}
                  {auditStep === "pasting" && <><Loader2 size={11} className="animate-spin" /> Analysing…</>}
                  {auditStep === "idle" && <><RefreshCw size={11} /> Run Audit</>}
                </button>
              </div>
            </div>

            {pasteMode && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,184,0,0.03)" }}>
                <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "10px", fontFamily: "var(--font-mono)" }}>
                  Paste your recent tweets below — one tweet per block, separated by a blank line. Then click Analyse.
                </p>
                <textarea
                  value={pastedTweets}
                  onChange={(e) => setPastedTweets(e.target.value)}
                  placeholder={"Your first tweet here...\n\nYour second tweet here...\n\nYour third tweet here..."}
                  style={{ width: "100%", minHeight: "180px", padding: "12px", background: "var(--bg-mid)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--t1)", fontSize: "13px", fontFamily: "var(--font-mono)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <button
                  onClick={runPasteAudit}
                  disabled={!pastedTweets.trim() || auditStep !== "idle"}
                  style={{ marginTop: "10px", padding: "9px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: (!pastedTweets.trim() || auditStep !== "idle") ? "not-allowed" : "pointer", opacity: (!pastedTweets.trim() || auditStep !== "idle") ? 0.4 : 1, fontFamily: "var(--font-manrope)" }}
                >
                  {auditStep === "pasting" ? "Analysing…" : "Analyse Pasted Tweets"}
                </button>
              </div>
            )}

            {auditError && (
              <div style={{ padding: "12px 20px", background: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                <p style={{ fontSize: "12px", color: "var(--red)", fontFamily: "var(--font-mono)" }}>{auditError}</p>
              </div>
            )}

            {!audit?.audit_result ? (
              <div style={{ padding: "48px 32px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "6px" }}>No audit yet.</p>
                <p style={{ fontSize: "12px", color: "var(--t3)" }}>
                  Paste your tweets using the button above, or set your X handle in Project → Integrations.
                </p>
              </div>
            ) : (() => {
              const r = audit.audit_result!;
              const gradeColor = r.overall_score >= 7 ? "var(--green)" : r.overall_score >= 5 ? "var(--gold)" : "var(--red)";
              return (
                <>
                  {/* Overall score */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "24px", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "80px", height: "80px", borderRadius: "12px", background: `${gradeColor}18`, border: `1px solid ${gradeColor}40` }}>
                      <span style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: gradeColor }}>{r.overall_grade}</span>
                      <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>{r.overall_score}/10</span>
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--t2)", marginBottom: "12px" }}>{r.summary}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {[
                          { label: "Tone match", value: r.vs_niche?.tone_match },
                          { label: "Hook quality", value: r.vs_niche?.hook_quality },
                          { label: "Format alignment", value: r.vs_niche?.format_alignment },
                          { label: "Engagement gap", value: r.vs_niche?.engagement_gap },
                        ].map((item, i) => (
                          <div key={i} style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--bg-mid)" }}>
                            <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t3)", marginBottom: "3px" }}>{item.label}</p>
                            <p style={{ fontSize: "11px", color: "var(--t2)", margin: 0 }}>{String(item.value ?? "—")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Strengths + Weaknesses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ padding: "16px 20px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                      <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--green)", marginBottom: "10px" }}>What's working</p>
                      {r.strengths?.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ color: "var(--green)", fontSize: "12px", flexShrink: 0 }}>✓</span>
                          <p style={{ fontSize: "12px", color: "var(--t2)", margin: 0, lineHeight: 1.5 }}>{String(s)}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--red)", marginBottom: "10px" }}>What's broken</p>
                      {r.weaknesses?.map((w, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ color: "var(--red)", fontSize: "12px", flexShrink: 0 }}>✗</span>
                          <p style={{ fontSize: "12px", color: "var(--t2)", margin: 0, lineHeight: 1.5 }}>{String(w)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tweet-by-tweet reviews */}
                  <div style={{ padding: "14px 20px", background: "var(--bg-mid)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>
                      Tweet Reviews ({r.tweet_reviews?.length ?? 0})
                      {" · "}
                      <span style={{ color: "var(--gold)" }}>{r.tweet_reviews?.filter((t: TweetReview) => t.needs_improvement).length ?? 0} improved</span>
                      {" · "}
                      <span style={{ color: "var(--green)" }}>{r.tweet_reviews?.filter((t: TweetReview) => !t.needs_improvement).length ?? 0} solid</span>
                    </p>
                  </div>
                  {r.tweet_reviews?.map((review: TweetReview, i: number) => {
                    const scoreColor = review.score >= 7 ? "var(--green)" : review.score >= 5 ? "var(--gold)" : "var(--red)";
                    return (
                      <div key={i} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                          {/* Score badge */}
                          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: `${scoreColor}18`, border: `1px solid ${scoreColor}40` }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: scoreColor, fontFamily: "var(--font-manrope)" }}>{review.score}</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "9px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                <Heart size={8} />{fmt(review.likes ?? 0)}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "9px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                                <MessageCircle size={8} />{fmt(review.replies ?? 0)}
                              </span>
                            </div>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Original tweet */}
                            <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--t1)", marginBottom: "8px", whiteSpace: "pre-line" }}>{String(review.original ?? "")}</p>

                            {/* Issues */}
                            {review.issues?.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                                {review.issues.map((issue: string, j: number) => (
                                  <span key={j} style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "5px", background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    {String(issue)}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Improved version */}
                            {review.needs_improvement && review.improved && (
                              <div style={{ borderRadius: "8px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", padding: "12px 14px" }}>
                                <p style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--green)", marginBottom: "6px" }}>Improved version</p>
                                <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--t1)", margin: 0, whiteSpace: "pre-line" }}>{String(review.improved)}</p>
                                {review.why_improved && (
                                  <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "6px", fontStyle: "italic" }}>{String(review.why_improved)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Audit meta */}
                  <div style={{ padding: "10px 20px", background: "var(--bg-mid)", display: "flex", gap: "16px" }}>
                    <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                      {new Date(audit.audit_date).toLocaleDateString()} · {audit.tweets_count} tweets · {audit.auto_fetched ? "auto" : "manual"}
                      {audit.niche_report_id ? " · benchmarked against niche report" : " · no niche report — benchmark limited"}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
