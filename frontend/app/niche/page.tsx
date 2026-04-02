"use client";

import { useState, useEffect } from "react";
import { api, NicheReportData } from "@/lib/api";
import { store } from "@/lib/store";
import { Loader2, Plus, Trash2, RefreshCw, BookOpen, Zap, BarChart2 } from "lucide-react";

const CATEGORIES = ["competitor", "kol", "ecosystem"] as const;
type Category = typeof CATEGORIES[number];

const categoryColors: Record<Category, { color: string; bg: string; border: string }> = {
  competitor: { color: "var(--red)",    bg: "var(--red-dim)",    border: "var(--red-border)"    },
  kol:        { color: "var(--yellow)", bg: "var(--yellow-dim)", border: "var(--yellow-border)" },
  ecosystem:  { color: "var(--green)",  bg: "var(--green-dim)",  border: "var(--green-border)"  },
};

interface Account { id: number; x_handle: string; category: string; added_at: string; }

export default function NichePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [report, setReport] = useState<NicheReportData | null>(null);
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState<Category>("competitor");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [running, setRunning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"hooks" | "formats" | "swipe">("hooks");

  const project = store.getProject();
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) { setLoadingAccounts(false); setLoadingReport(false); return; }
    loadAccounts();
    loadReport();
  }, [projectId]);

  async function loadAccounts() {
    if (!projectId) return;
    try {
      const res = await api.niche.listAccounts(projectId);
      setAccounts(res.accounts);
    } catch { /* backend may not be running */ }
    finally { setLoadingAccounts(false); }
  }

  async function loadReport() {
    if (!projectId) return;
    try {
      const res = await api.niche.latestReport(projectId);
      setReport(res.report);
    } catch { /* backend may not be running */ }
    finally { setLoadingReport(false); }
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
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (e) { setError((e as Error).message); }
  }

  async function runReport() {
    if (!projectId) return;
    setRunning(true); setError("");
    try {
      const result = await api.niche.runReport(projectId) as NicheReportData;
      setReport(result);
    } catch (e) { setError((e as Error).message); }
    finally { setRunning(false); }
  }

  const reportAge = report
    ? Math.round((Date.now() - new Date(report.report_date).getTime()) / 86400000)
    : null;

  return (
    <div style={{ padding: "52px 64px", maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>06</span>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Niche Intelligence</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", marginLeft: "22px", lineHeight: 1.5 }}>
          Track competitors and KOLs. Generate weekly pattern reports to improve your content.
        </p>
      </div>

      {!projectId && (
        <p style={{ fontSize: "14px", color: "var(--text-muted)", padding: "32px", textAlign: "center", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          Select a project to use Niche Intelligence.
        </p>
      )}

      {projectId && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", alignItems: "start" }}>

          {/* Left column: watched accounts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Add account */}
            <div style={{ borderRadius: "14px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                  Watched Accounts
                </p>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addAccount()}
                  placeholder="@handle"
                  style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "14px", width: "100%" }}
                />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "13px", width: "100%", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border-2)" }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={addAccount}
                  disabled={adding || !handle.trim()}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", opacity: (adding || !handle.trim()) ? 0.4 : 1 }}
                >
                  {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add Account
                </button>
              </div>

              {/* Account list */}
              {loadingAccounts ? (
                <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              ) : accounts.length === 0 ? (
                <p style={{ padding: "16px 20px", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                  No accounts yet.
                </p>
              ) : (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {accounts.map(acc => {
                    const cat = acc.category as Category;
                    const c = categoryColors[cat] ?? categoryColors.competitor;
                    return (
                      <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "13px", color: "var(--text)" }}>@{acc.x_handle}</span>
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "5px", fontWeight: 500, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
                            {acc.category}
                          </span>
                        </div>
                        <button
                          onClick={() => removeAccount(acc.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: "4px" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Run report button */}
            <button
              onClick={runReport}
              disabled={running || accounts.length === 0}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", fontSize: "13px", fontWeight: 500, background: "var(--surface)", border: "1px solid var(--border-2)", color: "var(--text-dim)", cursor: "pointer", opacity: (running || accounts.length === 0) ? 0.4 : 1 }}
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {running ? "Running analysis..." : "Run Report Now"}
            </button>
            {accounts.length > 0 && !running && (
              <p style={{ fontSize: "11px", color: "var(--text-subtle)", textAlign: "center", marginTop: "-8px" }}>
                Costs {accounts.length} Grok call{accounts.length > 1 ? "s" : ""} + 1 Claude call. Runs automatically every Monday.
              </p>
            )}
          </div>

          {/* Right column: report */}
          <div>
            {loadingReport ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : !report ? (
              <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", padding: "48px 32px", textAlign: "center" }}>
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No report yet.</p>
                <p style={{ fontSize: "13px", color: "var(--text-subtle)", marginTop: "8px" }}>Add accounts and run your first report.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Report meta */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: "12px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {report.accounts_analyzed} account{report.accounts_analyzed !== 1 ? "s" : ""} analysed
                      {reportAge !== null && ` · ${reportAge === 0 ? "today" : `${reportAge}d ago`}`}
                    </p>
                    {report.dominant_tone && (
                      <p style={{ fontSize: "13px", color: "var(--text)", marginTop: "4px" }}>
                        Dominant tone: <span style={{ color: "var(--accent-light)", fontWeight: 500 }}>{report.dominant_tone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Top insights */}
                {report.top_insights?.length > 0 && (
                  <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Zap size={13} style={{ color: "var(--yellow)" }} />
                      <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>Key Takeaways</p>
                    </div>
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {report.top_insights.map((insight, i) => (
                        <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-subtle)", minWidth: "16px", paddingTop: "2px" }}>{i + 1}</span>
                          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text)" }}>{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabs: Hooks / Formats / Swipe File */}
                <div style={{ borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    {([
                      { key: "hooks", label: "Hook Patterns", icon: <BarChart2 size={12} /> },
                      { key: "formats", label: "Post Formats", icon: <BarChart2 size={12} /> },
                      { key: "swipe", label: "Swipe File", icon: <BookOpen size={12} /> },
                    ] as const).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          background: "none",
                          border: "none",
                          borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                          color: activeTab === tab.key ? "var(--accent-light)" : "var(--text-muted)",
                          cursor: "pointer",
                          transition: "color 0.15s",
                        }}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Hooks */}
                  {activeTab === "hooks" && (
                    <div>
                      {!report.hook_patterns?.length ? (
                        <p style={{ padding: "24px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No hook data.</p>
                      ) : (
                        report.hook_patterns.map((h, i) => (
                          <div key={i} style={{ padding: "16px 20px", borderBottom: i < report.hook_patterns.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
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
                            {h.example && (
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5, borderLeft: "2px solid var(--border-2)", paddingLeft: "10px" }}>
                                "{h.example}"
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Formats */}
                  {activeTab === "formats" && (
                    <div>
                      {!report.post_formats?.length ? (
                        <p style={{ padding: "24px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No format data.</p>
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

                  {/* Swipe file */}
                  {activeTab === "swipe" && (
                    <div>
                      {!report.swipe_file?.length ? (
                        <p style={{ padding: "24px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>No examples yet.</p>
                      ) : (
                        report.swipe_file.map((ex, i) => (
                          <div key={i} style={{ padding: "18px 20px", borderBottom: i < report.swipe_file.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent-light)" }}>@{ex.handle}</span>
                              {ex.hook_type && (
                                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "5px", background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text-muted)", textTransform: "capitalize" }}>
                                  {ex.hook_type.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text)", marginBottom: "8px" }}>{ex.text}</p>
                            {ex.why && (
                              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>{ex.why}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: "13px", marginTop: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>
      )}
    </div>
  );
}
