"use client";

import { useState, useEffect } from "react";
import { api, NicheReportData, CacheStatusItem } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Plus, Trash2, RefreshCw, BookOpen, Zap, BarChart2, AlertCircle, CheckCircle2, Inbox, Wrench } from "lucide-react";

const CATEGORIES = ["competitor", "kol", "ecosystem"] as const;
type Category = typeof CATEGORIES[number];

const categoryColors: Record<Category, { color: string; bg: string; border: string }> = {
  competitor: { color: "var(--red)",    bg: "var(--red-dim)",    border: "var(--red-border)"    },
  kol:        { color: "var(--yellow)", bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  ecosystem:  { color: "var(--green)",  bg: "var(--green-dim)",  border: "var(--green-border)"  },
};

const cacheStatusColors: Record<CacheStatusItem["status"], { color: string; icon: React.ReactNode }> = {
  never_fetched: { color: "var(--yellow)",     icon: <AlertCircle size={12} /> },
  stale:         { color: "var(--yellow)",     icon: <AlertCircle size={12} /> },
  cached:        { color: "var(--green)",      icon: <CheckCircle2 size={12} /> },
  fetched_today: { color: "var(--text-muted)", icon: <CheckCircle2 size={12} /> },
};

const reportStatusConfig: Record<NicheReportData["status"], { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "Pending review", color: "var(--yellow)",     bg: "var(--yellow-dim)",  border: "var(--yellow-border)" },
  injected:  { label: "Injected",       color: "var(--green)",      bg: "var(--green-dim)",   border: "var(--green-border)"  },
  discarded: { label: "Discarded",      color: "var(--text-muted)", bg: "var(--surface-3)",   border: "var(--border-2)"      },
};

interface Account { id: number; x_handle: string; category: string; added_at: string; fetched_at: string | null; }

type RunStep = "idle" | "preview" | "running";
type MainTab = "auto" | "manual";
type ReportTab = "hooks" | "formats" | "swipe";

// ── Report detail card ──────────────────────────────────────────────────────

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
    <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Report header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
              {report.accounts_analyzed} account{report.accounts_analyzed !== 1 ? "s" : ""} · {reportAge === 0 ? "today" : `${reportAge}d ago`}
            </span>
            <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "6px", fontWeight: 500, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          {report.dominant_tone && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Dominant tone: {report.dominant_tone}</span>
          )}
        </div>
        {report.status === "pending" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onInject}
              disabled={injecting}
              style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, background: "var(--green-dim)", border: "1px solid var(--green-border)", color: "var(--green)", cursor: "pointer", opacity: injecting ? 0.4 : 1 }}
            >
              {injecting ? <Loader2 size={12} className="animate-spin" /> : "Inject"}
            </button>
            <button
              onClick={onDiscard}
              disabled={discarding}
              style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-muted)", cursor: "pointer", opacity: discarding ? 0.4 : 1 }}
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
            <Zap size={12} style={{ color: "var(--yellow)" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Key Takeaways</span>
          </div>
          {report.top_insights.slice(0, 3).map((insight, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-subtle)", minWidth: "14px" }}>{i + 1}</span>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text)", margin: 0 }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: hooks / formats / swipe */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        {([
          { key: "hooks", label: "Hooks", icon: <BarChart2 size={11} /> },
          { key: "formats", label: "Formats", icon: <BarChart2 size={11} /> },
          { key: "swipe", label: "Swipe File", icon: <BookOpen size={11} /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "10px", fontSize: "11px", fontWeight: 500, background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t.key ? "var(--accent-light)" : "var(--text-muted)",
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
            <p style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No hook data.</p>
          ) : (
            report.hook_patterns.map((h, i) => (
              <div key={i} style={{ padding: "14px 20px", borderBottom: i < report.hook_patterns.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", textTransform: "capitalize" }}>{h.type?.replace(/_/g, " ")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>×{h.frequency}</span>
                    <span style={{
                      fontSize: "10px", padding: "2px 8px", borderRadius: "5px", fontWeight: 500,
                      background: h.effectiveness === "high" ? "var(--green-dim)" : h.effectiveness === "medium" ? "var(--yellow-dim)" : "var(--surface-3)",
                      border: `1px solid ${h.effectiveness === "high" ? "var(--green-border)" : h.effectiveness === "medium" ? "var(--yellow-border)" : "var(--border-2)"}`,
                      color: h.effectiveness === "high" ? "var(--green)" : h.effectiveness === "medium" ? "var(--yellow)" : "var(--text-muted)",
                    }}>{h.effectiveness}</span>
                  </div>
                </div>
                {h.example && <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5, borderLeft: "2px solid var(--border-2)", paddingLeft: "10px" }}>"{h.example}"</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "formats" && (
        <div>
          {!report.post_formats?.length ? (
            <p style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No format data.</p>
          ) : (
            report.post_formats.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < report.post_formats.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", textTransform: "capitalize", marginBottom: "2px" }}>{f.format?.replace(/_/g, " ")}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{f.best_for}</p>
                </div>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-subtle)" }}>×{f.frequency}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "swipe" && (
        <div>
          {!report.swipe_file?.length ? (
            <p style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No examples.</p>
          ) : (
            report.swipe_file.map((ex, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < report.swipe_file.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent-light)" }}>@{ex.handle}</span>
                  {ex.hook_type && (
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "5px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {ex.hook_type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text)", marginBottom: "6px" }}>{ex.text}</p>
                {ex.why && <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>{ex.why}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function NichePage() {
  const [mainTab, setMainTab] = useState<MainTab>("auto");

  // Accounts state (used in manual tab)
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

  // Auto mode state
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
      // Add to allReports list
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
    <div style={{ padding: "52px 64px", maxWidth: "1060px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>06</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Niche Intelligence</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Track competitors and KOLs. Inject reports to sharpen generation.
        </p>
      </div>

      {!projectId && (
        <p style={{ fontSize: "14px", color: "var(--text-muted)", padding: "32px", textAlign: "center", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          Select a project to use Niche Intelligence.
        </p>
      )}

      {projectId && (
        <>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
            <button
              onClick={() => setMainTab("auto")}
              style={{
                padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px",
                background: mainTab === "auto" ? "var(--surface-3)" : "transparent",
                color: mainTab === "auto" ? "var(--text)" : "var(--text-muted)",
                border: mainTab === "auto" ? "1px solid var(--border-2)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Inbox size={13} />
              Reports
              {pendingCount > 0 && (
                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "5px", background: "var(--yellow-dim)", color: "var(--yellow)", border: "1px solid var(--yellow-border)", fontWeight: 600 }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab("manual")}
              style={{
                padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px",
                background: mainTab === "manual" ? "var(--surface-3)" : "transparent",
                color: mainTab === "manual" ? "var(--text)" : "var(--text-muted)",
                border: mainTab === "manual" ? "1px solid var(--border-2)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Wrench size={13} />
              Manual Run
            </button>
          </div>

          {/* ── Auto Mode tab ── */}
          {mainTab === "auto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {loadingReports ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              ) : allReports.length === 0 ? (
                <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", padding: "48px 32px", textAlign: "center" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No reports yet.</p>
                  <p style={{ fontSize: "13px", color: "var(--text-subtle)", marginTop: "8px" }}>
                    Run your first report in the Manual Run tab. Weekly reports appear here automatically.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {allReports.length} report{allReports.length !== 1 ? "s" : ""} · {pendingCount} pending
                    </span>
                    <button
                      onClick={loadAllReports}
                      style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <RefreshCw size={12} />
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
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", alignItems: "start" }}>

              {/* Left: accounts + run controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                      Watched Accounts
                    </p>
                  </div>
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAccount()}
                      placeholder="@handle"
                      style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "14px", width: "100%" }}
                    />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "13px", width: "100%", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border-2)" }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      onClick={addAccount}
                      disabled={adding || !handle.trim()}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (adding || !handle.trim()) ? 0.4 : 1 }}
                    >
                      {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Add
                    </button>
                  </div>

                  {loadingAccounts ? (
                    <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                    </div>
                  ) : accounts.length === 0 ? (
                    <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>No accounts yet.</p>
                  ) : (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      {accounts.map((acc) => {
                        const cat = acc.category as Category;
                        const c = categoryColors[cat] ?? categoryColors.competitor;
                        return (
                          <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "13px", color: "var(--text)" }}>@{acc.x_handle}</span>
                                <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "5px", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                                  {acc.category}
                                </span>
                              </div>
                              {acc.fetched_at && (
                                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                                  {Math.round((Date.now() - new Date(acc.fetched_at).getTime()) / 86400000)}d ago
                                </span>
                              )}
                            </div>
                            <button onClick={() => removeAccount(acc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: "4px" }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {runStep === "idle" && (
                  <button
                    onClick={previewRun}
                    disabled={accounts.length === 0}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px", borderRadius: "12px", fontSize: "13px", fontWeight: 500, background: "var(--surface)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: accounts.length === 0 ? 0.4 : 1 }}
                  >
                    <RefreshCw size={13} />
                    Run Report
                  </button>
                )}

                {/* Fetch summary */}
                {fetchSummary.length > 0 && runStep === "idle" && (
                  <div style={{ borderRadius: "12px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>Last run</p>
                    </div>
                    {fetchSummary.map((s, i) => (
                      <div key={i} style={{ padding: "9px 14px", borderBottom: i < fetchSummary.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>@{s.handle}</span>
                        <span style={{ fontSize: "11px", color: s.used_cache ? "var(--green)" : "var(--yellow)" }}>
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
                  <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>What will happen</p>
                    </div>
                    <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {cacheStatus.map((s) => {
                        const col = cacheStatusColors[s.status];
                        return (
                          <div key={s.handle} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                            <span style={{ color: col.color }}>{col.icon}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>@{s.handle}</span>
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</p>
                            </div>
                          </div>
                        );
                      })}

                      <div style={{ padding: "12px 14px", borderRadius: "10px", background: apiCallsNeeded > 0 ? "var(--yellow-dim)" : "var(--green-dim)", border: `1px solid ${apiCallsNeeded > 0 ? "var(--yellow-border)" : "var(--green-border)"}`, marginTop: "4px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: apiCallsNeeded > 0 ? "var(--yellow)" : "var(--green)" }}>
                          {apiCallsNeeded === 0
                            ? "All cached — this run is free"
                            : `${apiCallsNeeded} X API call${apiCallsNeeded > 1 ? "s" : ""} — est. $${estimatedCost.toFixed(2)}`}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                        <button
                          onClick={() => confirmRun(false)}
                          style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}
                        >
                          {apiCallsNeeded === 0 ? "Run (use cache)" : `Run — spend $${estimatedCost.toFixed(2)}`}
                        </button>
                        {apiCallsNeeded > 0 && (
                          <button
                            onClick={() => confirmRun(true)}
                            style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer" }}
                          >
                            Force re-fetch all
                          </button>
                        )}
                        <button
                          onClick={() => setRunStep("idle")}
                          style={{ padding: "10px 14px", borderRadius: "10px", fontSize: "13px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {runStep === "running" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-light)" }} />
                      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Scraping and analysing...</p>
                    </div>
                  </div>
                )}

                {runStep === "idle" && !manualReport && (
                  <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", padding: "48px 32px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Click "Run Report" to generate a report.</p>
                    <p style={{ fontSize: "13px", color: "var(--text-subtle)", marginTop: "8px" }}>A cost preview will appear first.</p>
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

          {error && <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}
        </>
      )}
    </div>
  );
}
