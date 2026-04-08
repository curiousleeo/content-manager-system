"use client";

import { useState, useEffect } from "react";
import { api, NicheReportData, CacheStatusItem } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

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

interface Account { id: number; x_handle: string; category: string; added_at: string; fetched_at: string | null; }

type RunStep = "idle" | "preview" | "running";

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

  const project = store.getProject();
  const projectId = project?.id;

  // Latest report for bottom panels
  const latestReport = allReports[0] ?? manualReport ?? null;

  useEffect(() => {
    if (!projectId) { setLoadingAccounts(false); setLoadingReports(false); return; }
    loadAccounts();
    loadAllReports();
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
          {/* ── Competitor Surveillance List ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
              {["#", "Handle", "Category", "Last Fetched", "Status", "Action", ""].map((h, i) => (
                <span key={i} style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>{h}</span>
              ))}
            </div>

            {/* Add row */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,184,0,0.02)" }}>
              <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>+</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAccount()}
                placeholder="@handle"
                style={{ padding: "7px 10px", borderRadius: "6px", fontSize: "12px", background: "var(--bg-mid)", color: "var(--t1)", outline: "none", marginRight: "8px" }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={{ padding: "7px 8px", borderRadius: "6px", fontSize: "11px", background: "var(--bg-mid)", color: "var(--t2)", outline: "none" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <span />
              <span />
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
                return (
                  <div key={acc.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 95px 75px 90px 40px", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "var(--bg-card)", color: "var(--t2)", cursor: "pointer", fontFamily: "var(--font-manrope)" }}
                >
                  <RefreshCw size={11} />
                  Run Full Report
                </button>
              </div>
            )}
          </div>

          {/* ── Run preview overlay ── */}
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
                <button
                  onClick={() => confirmRun(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: "pointer", fontFamily: "var(--font-manrope)" }}
                >
                  {apiCallsNeeded === 0 ? "Run (use cache)" : `Run — spend $${estimatedCost.toFixed(2)}`}
                </button>
                {apiCallsNeeded > 0 && (
                  <button
                    onClick={() => confirmRun(true)}
                    style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-mid)", color: "var(--t2)", cursor: "pointer" }}
                  >
                    Force re-fetch
                  </button>
                )}
                <button
                  onClick={() => setRunStep("idle")}
                  style={{ padding: "10px 16px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-card)", color: "var(--t3)", cursor: "pointer" }}
                >
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

          {/* ── Bottom two-column: Hook Patterns + Swipe Intelligence ── */}
          <div style={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: "16px", marginBottom: "20px" }}>

            {/* Left: Hook Patterns + Dominant Tone */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Hook Patterns */}
              <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>Hook Patterns</p>
                </div>
                {!latestReport?.hook_patterns?.length ? (
                  <div style={{ padding: "24px", textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "var(--t3)" }}>Run a report to see hook patterns.</p>
                  </div>
                ) : (
                  latestReport.hook_patterns.slice(0, 5).map((h, i) => (
                    <div key={i} style={{ padding: "11px 18px", borderBottom: i < Math.min(latestReport.hook_patterns.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--t1)", textTransform: "capitalize", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.type?.replace(/_/g, " ")}
                        </p>
                        {h.example && (
                          <p style={{ fontSize: "10px", color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{h.example}"</p>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>×{h.frequency}</span>
                        <span style={{
                          fontSize: "8px", padding: "1px 6px", borderRadius: "4px", fontWeight: 600, textTransform: "uppercase",
                          background: h.effectiveness === "high" ? "rgba(34,197,94,0.12)" : h.effectiveness === "medium" ? "rgba(255,184,0,0.12)" : "rgba(255,255,255,0.05)",
                          color: h.effectiveness === "high" ? "var(--green)" : h.effectiveness === "medium" ? "var(--gold)" : "var(--t3)",
                        }}>{h.effectiveness}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dominant Tone */}
              <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "18px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "10px" }}>Dominant Tone</p>
                {latestReport?.dominant_tone ? (
                  <>
                    <p style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", textTransform: "capitalize", marginBottom: "8px" }}>
                      {latestReport.dominant_tone}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--t3)" }}>
                      From {latestReport.accounts_analyzed} account{latestReport.accounts_analyzed !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{
                        fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontWeight: 500,
                        background: reportStatusConfig[latestReport.status].bg,
                        color: reportStatusConfig[latestReport.status].color,
                      }}>
                        {reportStatusConfig[latestReport.status].label}
                      </span>
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--t3)" }}>No data yet.</p>
                )}

                {/* Post formats */}
                {latestReport?.post_formats?.length > 0 && (
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "8px" }}>Top Formats</p>
                    {latestReport.post_formats.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--t2)", textTransform: "capitalize" }}>{f.format?.replace(/_/g, " ")}</span>
                        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>×{f.frequency}</span>
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
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--t1)", fontFamily: "var(--font-mono)" }}>
                          {new Date(r.report_date).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", marginLeft: "8px", background: reportStatusConfig[r.status].bg, color: reportStatusConfig[r.status].color }}>
                          {reportStatusConfig[r.status].label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Swipe Intelligence */}
            <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>Swipe Intelligence</p>
                  <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>Best-performing posts from your watch list</p>
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
                      style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", background: "transparent", color: "var(--t3)", cursor: "pointer", opacity: discardingId === latestReport.id ? 0.4 : 1 }}
                    >
                      {discardingId === latestReport.id ? <Loader2 size={11} className="animate-spin" /> : "Discard"}
                    </button>
                  </div>
                )}
              </div>

              {!latestReport?.swipe_file?.length ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "6px" }}>No swipe intelligence yet.</p>
                  <p style={{ fontSize: "12px", color: "var(--t3)" }}>Add accounts and run a report to unlock insights.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                  {latestReport.swipe_file.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "18px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        background: i % 4 < 2
                          ? "linear-gradient(135deg, rgba(255,184,0,0.06) 0%, rgba(10,10,15,0.8) 60%)"
                          : "linear-gradient(135deg, rgba(107,47,217,0.08) 0%, rgba(10,10,15,0.8) 60%)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Dark image thumbnail area */}
                      <div style={{ position: "absolute", top: 0, right: 0, width: "60px", height: "60px", background: i % 4 < 2 ? "rgba(255,184,0,0.06)" : "rgba(107,47,217,0.06)", borderBottomLeftRadius: "8px" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: 600 }}>@{ex.handle}</span>
                        {ex.hook_type && (
                          <span style={{ fontSize: "8px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--t3)", textTransform: "capitalize" }}>
                            {ex.hook_type.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--t1)", marginBottom: "6px" }}>{ex.text}</p>
                      {ex.why && <p style={{ fontSize: "11px", color: "var(--t3)", fontStyle: "italic" }}>{ex.why}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Top insights footer */}
              {latestReport?.top_insights?.length > 0 && (
                <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "var(--bg-mid)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)", marginBottom: "4px" }}>Key Takeaways</p>
                  {latestReport.top_insights.slice(0, 2).map((insight, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--gold)", minWidth: "14px" }}>{i + 1}</span>
                      <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--t2)", margin: 0 }}>{insight}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
