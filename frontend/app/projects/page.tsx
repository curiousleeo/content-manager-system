"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { store, type Project } from "@/lib/store";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const NAV_SECTIONS = [
  { id: "identity", label: "Core Identity" },
  { id: "pillars", label: "Content Pillars" },
  { id: "schedule", label: "Posting Schedule" },
  { id: "channels", label: "Logic & Channels" },
  { id: "integrations", label: "Integrations" },
];

const empty = (): Partial<Project> => ({
  name: "",
  description: "",
  tone: "",
  style: "",
  avoid: "",
  target_audience: "",
  content_pillars: [],
  posting_days: [],
  posting_times: [],
  coingecko_enabled: false,
  telegram_channels: [],
  timezone: "UTC",
});

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px 8px 0 0",
    fontSize: "13px",
    background: "var(--bg-mid)",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "var(--t1)",
    outline: "none",
    transition: "border-color 0.15s",
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeSection, setActiveSection] = useState("identity");
  const [pillarInput, setPillarInput] = useState("");

  useEffect(() => {
    loadProjects();
    setActiveProject(store.getProject());
  }, []);

  async function loadProjects() {
    try {
      const res = await api.projects.list() as { projects: Project[] };
      setProjects(res.projects);
    } catch { /* backend may not be running */ }
  }

  async function save() {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await api.projects.create(editing);
      } else {
        await api.projects.update(editing.id!, editing);
      }
      setEditing(null);
      await loadProjects();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.projects.delete(id);
      if (activeProject?.id === id) {
        store.clearProject();
        setActiveProject(null);
      }
      await loadProjects();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function activate(p: Project) {
    store.setProject(p);
    setActiveProject(p);
  }

  function toggleDay(day: string) {
    const days = editing?.posting_days ?? [];
    setEditing({
      ...editing,
      posting_days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  }

  function addPillar() {
    if (!pillarInput.trim()) return;
    const pillars = editing?.content_pillars ?? [];
    setEditing({ ...editing, content_pillars: [...pillars, pillarInput.trim()] });
    setPillarInput("");
  }

  function removePillar(idx: number) {
    const pillars = editing?.content_pillars ?? [];
    setEditing({ ...editing, content_pillars: pillars.filter((_, i) => i !== idx) });
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: "1000px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
            PROJECT CONFIG
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
            Projects
          </h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setEditing(empty()); setIsNew(true); setActiveSection("identity"); }}
            style={{ padding: "10px 22px", background: "var(--gold)", color: "#000", fontSize: "13px", fontWeight: 700, borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "var(--font-manrope)" }}
          >
            New Project
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: "12px", marginBottom: "16px", fontFamily: "var(--font-mono)", color: "var(--red)" }}>{error}</p>}

      {/* Project list */}
      {!editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.length === 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "var(--t3)" }}>No projects yet.</p>
              <p style={{ fontSize: "12px", color: "var(--ti)", marginTop: "6px" }}>Create one to get started.</p>
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                borderRadius: "14px",
                padding: "22px 24px",
                background: "var(--bg-card)",
                border: `1px solid ${activeProject?.id === p.id ? "rgba(255,184,0,0.3)" : "var(--border)"}`,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--t1)", fontFamily: "var(--font-manrope)" }}>{p.name}</p>
                    {activeProject?.id === p.id && (
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--gold)", border: "1px solid rgba(255,184,0,0.3)", borderRadius: "5px", padding: "2px 7px", background: "rgba(255,184,0,0.08)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        active
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: "13px", color: "var(--t3)", marginBottom: "10px" }}>{p.description}</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ti)" }}>
                    {p.tone && <span>tone: {p.tone.slice(0, 40)}{p.tone.length > 40 ? "…" : ""}</span>}
                    {p.content_pillars?.length ? <span>pillars: {p.content_pillars.slice(0, 3).join(", ")}</span> : null}
                    {p.posting_days?.length ? <span>posts: {p.posting_days.join(", ")}</span> : null}
                    {p.coingecko_enabled ? <span style={{ color: "var(--green)" }}>coingecko ✓</span> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => activate(p)}
                    disabled={activeProject?.id === p.id}
                    style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", border: `1px solid ${activeProject?.id === p.id ? "rgba(255,184,0,0.3)" : "var(--border)"}`, color: activeProject?.id === p.id ? "var(--gold)" : "var(--t3)", background: "var(--bg-mid)", cursor: activeProject?.id === p.id ? "default" : "pointer", opacity: activeProject?.id === p.id ? 0.7 : 1 }}
                  >
                    {activeProject?.id === p.id ? "Active" : "Select"}
                  </button>
                  <button
                    onClick={() => { setEditing(p); setIsNew(false); setActiveSection("identity"); }}
                    style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", color: "var(--t2)", background: "var(--bg-mid)", cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    style={{ fontSize: "12px", padding: "7px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", color: "var(--t3)", background: "transparent", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor — 2-column: sticky nav + form */}
      {editing && (
        <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: "32px", alignItems: "start" }}>

          {/* Left sticky nav */}
          <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ti)", marginBottom: "10px", fontFamily: "var(--font-mono)" }}>
              {isNew ? "New Project" : editing.name}
            </p>
            {NAV_SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  textAlign: "left", padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
                  background: activeSection === s.id ? "rgba(255,184,0,0.08)" : "transparent",
                  color: activeSection === s.id ? "var(--gold)" : "var(--t3)",
                  border: activeSection === s.id ? "1px solid rgba(255,184,0,0.2)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", fontFamily: "var(--font-manrope)", fontWeight: activeSection === s.id ? 600 : 400,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Right form */}
          <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>

            {activeSection === "identity" && (
              <>
                <SectionHeading>Core Identity</SectionHeading>
                <FieldRow label="Project Name *">
                  <input
                    style={inputStyle()}
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. GTR Trade, Personal Brand"
                  />
                </FieldRow>
                <FieldRow label="Description">
                  <input
                    style={inputStyle()}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="What is this project about?"
                  />
                </FieldRow>
                <FieldRow label="Tone" hint="How should it sound?">
                  <input
                    style={inputStyle()}
                    value={editing.tone ?? ""}
                    onChange={(e) => setEditing({ ...editing, tone: e.target.value })}
                    placeholder="e.g. direct, trader-to-trader, no hype"
                  />
                </FieldRow>
                <FieldRow label="Style" hint="How should it be written?">
                  <input
                    style={inputStyle()}
                    value={editing.style ?? ""}
                    onChange={(e) => setEditing({ ...editing, style: e.target.value })}
                    placeholder="e.g. short sentences, first person, punchy"
                  />
                </FieldRow>
                <FieldRow label="Avoid" hint="What should never appear?">
                  <input
                    style={inputStyle()}
                    value={editing.avoid ?? ""}
                    onChange={(e) => setEditing({ ...editing, avoid: e.target.value })}
                    placeholder="e.g. emojis, buzzwords, corporate language, hype"
                  />
                </FieldRow>
                <FieldRow label="Target Audience">
                  <input
                    style={inputStyle()}
                    value={editing.target_audience ?? ""}
                    onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })}
                    placeholder="e.g. active crypto traders, DeFi users"
                  />
                </FieldRow>
              </>
            )}

            {activeSection === "pillars" && (
              <>
                <SectionHeading>Content Pillars</SectionHeading>
                <FieldRow label="Add Pillar">
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      style={{ ...inputStyle(), flex: 1 }}
                      value={pillarInput}
                      onChange={(e) => setPillarInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPillar()}
                      placeholder="e.g. crypto perps, self-custody"
                    />
                    <button
                      onClick={addPillar}
                      disabled={!pillarInput.trim()}
                      style={{ padding: "9px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.3)", color: "var(--gold)", cursor: "pointer", opacity: !pillarInput.trim() ? 0.4 : 1, whiteSpace: "nowrap" }}
                    >
                      + Add
                    </button>
                  </div>
                </FieldRow>
                {(editing.content_pillars ?? []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(editing.content_pillars ?? []).map((p, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "6px 12px", borderRadius: "20px", fontSize: "12px",
                          background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)",
                          color: "var(--gold)",
                        }}
                      >
                        {p}
                        <button
                          onClick={() => removePillar(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", opacity: 0.6, padding: "0", lineHeight: 1, fontSize: "14px" }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {(editing.content_pillars ?? []).length === 0 && (
                  <p style={{ fontSize: "12px", color: "var(--ti)" }}>No pillars yet. Add topics that define your content focus.</p>
                )}
              </>
            )}

            {activeSection === "schedule" && (
              <>
                <SectionHeading>Posting Schedule</SectionHeading>
                <FieldRow label="Posting Days">
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {DAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        style={{
                          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", cursor: "pointer", transition: "all 0.15s",
                          background: editing.posting_days?.includes(d) ? "rgba(255,184,0,0.1)" : "var(--bg-mid)",
                          border: `1px solid ${editing.posting_days?.includes(d) ? "rgba(255,184,0,0.35)" : "var(--border)"}`,
                          color: editing.posting_days?.includes(d) ? "var(--gold)" : "var(--t3)",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </FieldRow>
                <FieldRow label="Posting Times" hint="Comma-separated, 24h format">
                  <input
                    style={inputStyle()}
                    value={(editing.posting_times ?? []).join(", ")}
                    onChange={(e) =>
                      setEditing({ ...editing, posting_times: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                    }
                    placeholder="e.g. 09:00, 17:00"
                  />
                </FieldRow>
                <FieldRow label="Timezone" hint="IANA name">
                  <input
                    style={inputStyle()}
                    value={editing.timezone ?? "UTC"}
                    onChange={(e) => setEditing({ ...editing, timezone: e.target.value.trim() || "UTC" })}
                    placeholder="e.g. Asia/Manila, America/New_York"
                  />
                </FieldRow>
              </>
            )}

            {activeSection === "channels" && (
              <>
                <SectionHeading>Logic & Channels</SectionHeading>
                <FieldRow label="CoinGecko Trending" hint="Free, no key required">
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    {/* Custom toggle */}
                    <div
                      onClick={() => setEditing({ ...editing, coingecko_enabled: !editing.coingecko_enabled })}
                      style={{
                        width: "40px", height: "22px", borderRadius: "11px", position: "relative", cursor: "pointer", transition: "background 0.2s",
                        background: editing.coingecko_enabled ? "var(--gold)" : "var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: "absolute", top: "3px",
                        left: editing.coingecko_enabled ? "21px" : "3px",
                        width: "16px", height: "16px", borderRadius: "50%",
                        background: editing.coingecko_enabled ? "#000" : "var(--t3)",
                        transition: "left 0.2s",
                      }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--t2)" }}>
                      Enable CoinGecko trending in research
                    </span>
                  </label>
                </FieldRow>
                <FieldRow label="Telegram Channels" hint="Public slugs, comma-separated (no @)">
                  <input
                    style={inputStyle()}
                    value={(editing.telegram_channels ?? []).join(", ")}
                    onChange={(e) =>
                      setEditing({ ...editing, telegram_channels: e.target.value.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean) })
                    }
                    placeholder="e.g. coindesk, durov, hyperliquid"
                  />
                  <p style={{ fontSize: "11px", color: "var(--ti)", marginTop: "6px" }}>
                    Only public channels. Scraped automatically during research.
                  </p>
                </FieldRow>
              </>
            )}

            {activeSection === "integrations" && (
              <>
                <SectionHeading>Integrations</SectionHeading>
                <FieldRow label="X Bearer Token" hint="Required for Niche Intelligence">
                  <input
                    style={inputStyle()}
                    type="password"
                    value={editing.x_bearer_token ?? ""}
                    onChange={(e) => setEditing({ ...editing, x_bearer_token: e.target.value })}
                    placeholder="Bearer token from developer.twitter.com"
                  />
                  <p style={{ fontSize: "11px", color: "var(--ti)", marginTop: "6px" }}>
                    Used to scrape competitor timelines. Get it from the X Developer Portal → your app → Keys & Tokens.
                    If left blank, falls back to the global <code style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>X_BEARER_TOKEN</code> env var.
                  </p>
                </FieldRow>
                <FieldRow label="Your X Handle" hint="For personal tweet audit">
                  <input
                    style={inputStyle()}
                    value={editing.personal_x_handle ?? ""}
                    onChange={(e) => setEditing({ ...editing, personal_x_handle: e.target.value.replace(/^@/, "") })}
                    placeholder="yourhandle (no @)"
                  />
                </FieldRow>
                <FieldRow label="Your X Numeric User ID" hint="Bypasses paid API lookup">
                  <input
                    style={inputStyle()}
                    value={editing.personal_x_user_id ?? ""}
                    onChange={(e) => setEditing({ ...editing, personal_x_user_id: e.target.value.trim() })}
                    placeholder="e.g. 2038698307405705216"
                  />
                  <p style={{ fontSize: "11px", color: "var(--ti)", marginTop: "6px" }}>
                    Paste your numeric ID to skip the paid username lookup. Find it at{" "}
                    <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>tweeterid.com</span>
                    {" "}or from the error message if you saw one.
                  </p>
                </FieldRow>
                <FieldRow label="Auto-fetch every Monday">
                  <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                    <div
                      onClick={() => setEditing({ ...editing, audit_auto_fetch: !editing.audit_auto_fetch })}
                      style={{ width: "40px", height: "22px", borderRadius: "11px", position: "relative", cursor: "pointer", transition: "background 0.2s", background: editing.audit_auto_fetch ? "var(--gold)" : "var(--border)", flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: "3px", left: editing.audit_auto_fetch ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: editing.audit_auto_fetch ? "#000" : "var(--t3)", transition: "left 0.2s" }} />
                    </div>
                    <span style={{ fontSize: "13px", color: "var(--t2)" }}>Fetch + audit your tweets automatically every Monday at 07:00 UTC</span>
                  </label>
                </FieldRow>
              </>
            )}

            {/* Save button — full width */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", display: "flex", gap: "10px" }}>
              <button
                onClick={save}
                disabled={saving || !editing.name?.trim()}
                style={{ flex: 1, padding: "12px", background: "var(--gold)", color: "#000", fontSize: "14px", fontWeight: 700, borderRadius: "10px", border: "none", cursor: "pointer", opacity: (saving || !editing.name?.trim()) ? 0.4 : 1, fontFamily: "var(--font-manrope)" }}
              >
                {saving ? "Saving..." : isNew ? "Create Project" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{ padding: "12px 24px", background: "var(--bg-mid)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--t3)", fontSize: "13px", borderRadius: "10px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-manrope)", color: "var(--t1)", margin: 0 }}>
      {children}
    </h2>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-mono)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--t3)" }}>
        {label}
        {hint && <span style={{ textTransform: "none", letterSpacing: "normal", marginLeft: "6px", color: "var(--ti)", fontWeight: 400 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
