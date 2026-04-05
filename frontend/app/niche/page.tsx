"use client";

import { useState, useEffect } from "react";
import { api, NicheReportData, CacheStatusItem } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Plus, Trash2, RefreshCw, BookOpen, Zap, BarChart2, AlertCircle, CheckCircle2, Inbox, Wrench } from "lucide-react";

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
  pending:   { label: "Pending review", color: "var(--gold)",   bg: "rgba(255,184,0,0.1)"    },
  injected:  { label: "Injected",       color: "var(--green)",  bg: "rgba(34,197,94,0.1)"    },
  discarded: { label: "Discarded",      color: "var(--t3)",     bg: "rgba(255,255,255,0.05)" },
};

interface Account { id: number; x_handle: string; category: string; added_at: string; fetched_at: string | null; }

type RunStep = "idle" | "preview" | "running";
type MainTab = "auto" | "manual";
type ReportTab = "hooks" | "formats" | "swipe";

function ReportCard({ report, onInject, onDiscard, injecting, discarding }: {
  report: NicheReportData;
  onInject?: () => void;
  onDiscard?: () => void;
  injecting?: boolean;
  discarding?: boolean;
}) {
  const [tab, setTab] = useState<ReportTab>("hooks");
  const reportAge = Math.round((Date.now() - new Date(report.report_date).getTime()) / 86400000);
  const statusCfg = reportStatusConfig[report.status];

  return (
    <div style={{ borderRadius: "14px", background: "var(--bg-card)", border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Report header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)" }}>
              {report.accounts_analyzed} account{report.accounts_analyzed !== 1 ? "s" : ""} · {reportAge === 0 ? "today" : `${reportAge}d ago`}
            </span>
            <span style={{ fontSize: "10px", padding: "2px 9px", borderRadius: "5px", fontWeight: 500, background: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          {report.dominant_tone && (
            <span style={{ fontSize: "12px", color: "var(--t3)" }}>Dominant tone: {report.dominant_tone}</span>
          )}
        </div>
        {report.status === "pending" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onInject}
              disabled={injecting}
              style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--green)", cursor: "pointer", opacity: injecting ? 0.4 : 1 }}
            >
              {injecting ? <Loader2 size={12} className="animate-spin" /> : "Inject"}
            </button>
            <button
              onClick={onDiscard}
              disabled={discarding}
              style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)", cursor: "pointer", opacity: discarding ? 0.4 : 1 }}
            >
              {discarding ? <Loader2 size={12} className="animate-spin" /> : "Discard"}
            </button>
          </div>
        )}
      </div>

      {/* Top insights */}
      {report.top_insights?.length > 0 && (
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Zap size={12} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Key Takeaways</span>
          </div>
          {report.top_insights.slice(0, 3).map((insight, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ti)", minWidth: "14px" }}>{i + 1}</span>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--t1)", margin: 0 }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)" }}>
        {([
          { key: "hooks", label: "Hook Patterns", icon: <BarChart2 size={11} /> },
          { key: "formats", label: "Formats", icon: <BarChart2 size={11} /> },
          { key: "swipe", label: "Swipe Intelligence", icon: <BookOpen size={11} /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "10px", fontSize: "11px", fontWeight: 500, background: "none", border: "none",
              borderBottom: tab === t.key ? `2px solid var(--gold)` : "2px solid transparent",
              color: tab === t.key ? "var(--gold)" : "var(--t3)",
              cursor: "pointer",
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "hooks" && (
        <div>
          {!report.hook_patterns?.length ? (
            <p style={{ padding: "20px", fontSize: "12px", color: "var(--t3)", textAlign: "center" }}>No hook data.</p>
          ) : (
            report.hook_patterns.map((h, i) => (
              <div key={i} style={{ padding: "14px 20px", borderBottom: i < report.hook_patterns.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)", textTransform: "capitalize" }}>{h.type?.replace(/_/g, " ")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>×{h.frequency}</span>
                    <span style={{
                      fontSize: "9px", padding: "2px 7px", borderRadius: "4px", fontWeight: 500, textTransform: "uppercase",
                      background: h.effectiveness === "high" ? "rgba(34,197,94,0.1)" : h.effectiveness === "medium" ? "rgba(255,184,0,0.1)" : "rgba(255,255,255,0.05)",
                      color: h.effectiveness === "high" ? "var(--green)" : h.effectiveness === "medium" ? "var(--gold)" : "var(--t3)",
                    }}>{h.effectiveness}</span>
                  </div>
                </div>
                {h.example && <p style={{ fontSize: "12px", color: "var(--t3)", fontStyle: "italic", lineHeight: 1.5, borderLeft: "2px solid var(--border)", paddingLeft: "10px" }}>"{h.example}"</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "formats" && (
        <div>
          {!report.post_formats?.length ? (
            <p style={{ padding: "20px", fontSize: "12px", color: "var(--t3)", textAlign: "center" }}>No format data.</p>
          ) : (
            report.post_formats.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < report.post_formats.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)", textTransform: "capitalize", marginBottom: "2px" }}>{f.format?.replace(/_/g, " ")}</p>
                  <p style={{ fontSize: "12px", color: "var(--t3)" }}>{f.best_for}</p>
                </div>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--t3)" }}>×{f.frequency}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "swipe" && (
        <div>
          {!report.swipe_file?.length ? (
            <p style={{ padding: "20px", fontSize: "12px", color: "var(--t3)", textAlign: "center" }}>No examples.</p>
          ) : (
            report.swipe_file.map((ex, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < report.swipe_file.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--gold)" }}>@{ex.handle}</span>
                  {ex.hook_type && (
                    <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--t3)", textTransform: "capitalize" }}>
                      {ex.hook_type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--t1)", marginBottom: "6px" }}>{ex.text}</p>
                {ex.why && <p style={{ fontSize: "12px", color: "var(--t3)", fontStyle: "italic" }}>{ex.why}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NichePage() {
  const [mainTab, setMainTab] = useState<MainTab>("auto");

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

  const pendingCount = allReports.filter((r) => r.status === "pending").length;

  return (
    <div style={{ padding: "40px 48px", maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
          COMPETITOR INTEL
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
          Competitor <span style={{ color: "var(--gold)" }}>Vault</span>
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", marginTop: "8px" }}>
          Track competitors and KOLs. Inject reports to sharpen generation.
        </p>
      </div>

      {!projectId && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "48px 32px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--t3)" }}>Select a project to use Niche Intelligence.</p>
        </div>
      )}

      {projectId && (
        <>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
            <button
              onClick={() => setMainTab("auto")}
              style={{
                padding: "8px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px",
                background: mainTab === "auto" ? "rgba(255,184,0,0.08)" : "transparent",
                color: mainTab === "auto" ? "var(--gold)" : "var(--t3)",
                border: mainTab === "auto" ? "1px solid rgba(255,184,0,0.25)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Inbox size={12} />
              Reports
              {pendingCount > 0 && (
                <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "5px", background: "rgba(255,184,0,0.15)", color: "var(--gold)", fontWeight: 600 }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab("manual")}
              style={{
                padding: "8px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px",
                background: mainTab === "manual" ? "rgba(255,184,0,0.08)" : "transparent",
                color: mainTab === "manual" ? "var(--gold)" : "var(--t3)",
                border: mainTab === "manual" ? "1px solid rgba(255,184,0,0.25)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Wrench size={12} />
              Manual Run
            </button>
          </div>

          {/* ── Reports tab ── */}
          {mainTab === "auto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {loadingReports ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--t3)" }} />
                </div>
              ) : allReports.length === 0 ? (
                <div style={{ borderRadius: "14px", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "var(--t3)" }}>No reports yet.</p>
                  <p style={{ fontSize: "12px", color: "var(--ti)", marginTop: "8px" }}>
                    Run your first report in the Manual Run tab. Weekly reports appear here automatically.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
                      {allReports.length} report{allReports.length !== 1 ? "s" : ""} · {pendingCount} pending
                    </span>
                    <button
                      onClick={loadAllReports}
                      style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--t3)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <RefreshCw size={11} />
                      Refresh
                    </button>
                  </div>
                  {allReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onInject={() => injectReport(report.id)}
                      onDiscard={() => discardReport(report.id)}
                      injecting={injectingId === report.id}
                      discarding={discardingId === report.id}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Manual Run tab ── */}
          {mainTab === "manual" && (
            <div style={{ display: "grid", gridTemplateColumns: "4fr 8fr", gap: "24px", alignItems: "start" }}>

              {/* Left: account input + accounts list + run button */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Add account inline row */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)" }}>
                    <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Add Account</p>
                  </div>
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAccount()}
                      placeholder="@handle"
                      style={{ padding: "9px 12px", borderRadius: "8px", fontSize: "13px", width: "100%", background: "var(--bg-mid)", border: "1px solid var(--border)", color: "var(--t1)", outline: "none" }}
                    />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      style={{ padding: "9px 12px", borderRadius: "8px", fontSize: "12px", width: "100%", background: "var(--bg-mid)", color: "var(--t2)", border: "1px solid var(--border)", outline: "none" }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      onClick={addAccount}
                      disabled={adding || !handle.trim()}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: "pointer", opacity: (adding || !handle.trim()) ? 0.4 : 1, fontFamily: "var(--font-manrope)" }}
                    >
                      {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add Account
                    </button>
                  </div>
                </div>

                {/* Accounts surveillance table */}
                {loadingAccounts ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--t3)" }} />
                  </div>
                ) : accounts.length > 0 && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)" }}>
                      <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Watched ({accounts.length})</p>
                    </div>
                    {accounts.map((acc) => {
                      const cat = acc.category as Category;
                      const c = categoryColors[cat] ?? categoryColors.competitor;
                      return (
                        <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--t1)", fontFamily: "var(--font-mono)" }}>@{acc.x_handle}</span>
                            <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "4px", fontWeight: 500, background: c.bg, color: c.color }}>
                              {acc.category}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {acc.fetched_at && (
                              <span style={{ fontSize: "10px", color: "var(--ti)", fontFamily: "var(--font-mono)" }}>
                                {Math.round((Date.now() - new Date(acc.fetched_at).getTime()) / 86400000)}d
                              </span>
                            )}
                            <button onClick={() => removeAccount(acc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ti)", padding: "2px" }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {runStep === "idle" && (
                  <button
                    onClick={previewRun}
                    disabled={accounts.length === 0}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t2)", cursor: "pointer", opacity: accounts.length === 0 ? 0.4 : 1, fontFamily: "var(--font-manrope)" }}
                  >
                    <RefreshCw size={13} />
                    Run Report
                  </button>
                )}

                {fetchSummary.length > 0 && runStep === "idle" && (
                  <div style={{ borderRadius: "10px", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)" }}>
                      <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Last run</p>
                    </div>
                    {fetchSummary.map((s, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderBottom: i < fetchSummary.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-mono)" }}>@{s.handle}</span>
                        <span style={{ fontSize: "10px", color: s.used_cache ? "var(--green)" : "var(--gold)" }}>
                          {s.used_cache ? "cache" : "fetched"} · {s.posts_count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: preview / running / report */}
              <div>
                {runStep === "preview" && (
                  <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-mid)" }}>
                      <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t3)" }}>Cost Preview</p>
                    </div>
                    <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {cacheStatus.map((s) => {
                        const col = cacheStatusColors[s.status];
                        return (
                          <div key={s.handle} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", background: "var(--bg-mid)", border: "1px solid var(--border)" }}>
                            <span style={{ color: col.color }}>{col.icon}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--t1)", fontFamily: "var(--font-mono)" }}>@{s.handle}</span>
                              <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "2px" }}>{s.label}</p>
                            </div>
                          </div>
                        );
                      })}

                      <div style={{ padding: "12px 14px", borderRadius: "10px", background: apiCallsNeeded > 0 ? "rgba(255,184,0,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${apiCallsNeeded > 0 ? "rgba(255,184,0,0.25)" : "rgba(34,197,94,0.25)"}`, marginTop: "4px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: apiCallsNeeded > 0 ? "var(--gold)" : "var(--green)" }}>
                          {apiCallsNeeded === 0
                            ? "All cached — this run is free"
                            : `${apiCallsNeeded} X API call${apiCallsNeeded > 1 ? "s" : ""} — est. $${estimatedCost.toFixed(2)}`}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                        <button
                          onClick={() => confirmRun(false)}
                          style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: "pointer", fontFamily: "var(--font-manrope)" }}
                        >
                          {apiCallsNeeded === 0 ? "Run (use cache)" : `Run — spend $${estimatedCost.toFixed(2)}`}
                        </button>
                        {apiCallsNeeded > 0 && (
                          <button
                            onClick={() => confirmRun(true)}
                            style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-mid)", border: "1px solid var(--border)", color: "var(--t2)", cursor: "pointer" }}
                          >
                            Force re-fetch all
                          </button>
                        )}
                        <button
                          onClick={() => setRunStep("idle")}
                          style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "13px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--t3)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {runStep === "running" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px", background: "var(--bg-card)", borderRadius: "14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                      <Loader2 size={22} className="animate-spin" style={{ color: "var(--gold)" }} />
                      <p style={{ fontSize: "13px", color: "var(--t3)" }}>Scraping and analysing...</p>
                    </div>
                  </div>
                )}

                {runStep === "idle" && !manualReport && (
                  <div style={{ borderRadius: "14px", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "48px 32px", textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--t3)" }}>Click "Run Report" to generate a report.</p>
                    <p style={{ fontSize: "12px", color: "var(--ti)", marginTop: "8px" }}>A cost preview will appear first.</p>
                  </div>
                )}

                {runStep === "idle" && manualReport && (
                  <ReportCard
                    report={manualReport}
                    onInject={() => injectReport(manualReport.id)}
                    onDiscard={() => discardReport(manualReport.id)}
                    injecting={injectingId === manualReport.id}
                    discarding={discardingId === manualReport.id}
                  />
                )}
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: "12px", marginTop: "16px", fontFamily: "var(--font-mono)", color: "var(--red)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
