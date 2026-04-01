"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { store, type Project } from "@/lib/store";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const empty = (): Partial<Project> => ({
  name: "",
  description: "",
  tone: "",
  style: "",
  avoid: "",
  target_audience: "",
  content_pillars: [],
  default_subreddits: [],
  posting_days: [],
  posting_times: [],
});

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeProject, setActiveProject] = useState<Project | null>(null);

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

  return (
    <div style={{ padding: "52px 64px", maxWidth: "860px" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px" }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "8px", color: "var(--text)" }}>Projects</h2>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.5 }}>Each project has its own voice, schedule, and content pillars.</p>
        </div>
        <button
          onClick={() => { setEditing(empty()); setIsNew(true); }}
          style={{ padding: "12px 24px", background: "var(--accent)", color: "#fff", fontSize: "14px", fontWeight: 500, borderRadius: "10px", border: "none", cursor: "pointer", whiteSpace: "nowrap", marginTop: "4px", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          New project
        </button>
      </div>

      {error && <p style={{ fontSize: "13px", marginBottom: "16px", fontFamily: "monospace", color: "var(--red)" }}>{error}</p>}

      {/* Project list */}
      {!editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {projects.length === 0 && (
            <p style={{ fontSize: "14px", color: "var(--text-subtle)" }}>No projects yet. Create one to get started.</p>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              style={{
                borderRadius: "14px",
                padding: "24px",
                background: "var(--surface)",
                border: `1px solid ${activeProject?.id === p.id ? "var(--border-2)" : "var(--border)"}`,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 500, color: "var(--text)" }}>{p.name}</p>
                    {activeProject?.id === p.id && (
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--teal-text)", border: "1px solid var(--teal-border)", borderRadius: "6px", padding: "2px 8px", background: "var(--teal-dim)" }}>
                        active
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "10px" }}>{p.description}</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", fontFamily: "monospace", color: "var(--text-subtle)" }}>
                    {p.tone && <span>tone: {p.tone.slice(0, 40)}{p.tone.length > 40 ? "…" : ""}</span>}
                    {p.content_pillars?.length ? <span>pillars: {p.content_pillars.slice(0, 3).join(", ")}</span> : null}
                    {p.posting_days?.length ? <span>posts: {p.posting_days.join(", ")}</span> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => activate(p)}
                    disabled={activeProject?.id === p.id}
                    style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border-2)", color: "var(--text-dim)", background: "var(--surface-2)", cursor: activeProject?.id === p.id ? "default" : "pointer", opacity: activeProject?.id === p.id ? 0.4 : 1, transition: "opacity 0.15s" }}
                  >
                    {activeProject?.id === p.id ? "Active" : "Select"}
                  </button>
                  <button
                    onClick={() => { setEditing(p); setIsNew(false); }}
                    style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border-2)", color: "var(--text-dim)", background: "var(--surface-2)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    style={{ fontSize: "13px", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", color: "var(--text-subtle)", background: "transparent", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "var(--red-border)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-subtle)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div style={{ borderRadius: "14px", padding: "32px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "28px", color: "var(--text)" }}>
            {isNew ? "New project" : `Edit — ${editing.name}`}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Field label="Project name *">
              <input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. GTR Trade, Personal Brand"
              />
            </Field>

            <Field label="Description">
              <input
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="What is this project about?"
              />
            </Field>

            <SectionDivider label="Brand Voice" />

            <Field label="Tone" hint="How should it sound?">
              <input
                value={editing.tone ?? ""}
                onChange={(e) => setEditing({ ...editing, tone: e.target.value })}
                placeholder="e.g. direct, trader-to-trader, no hype"
              />
            </Field>

            <Field label="Style" hint="How should it be written?">
              <input
                value={editing.style ?? ""}
                onChange={(e) => setEditing({ ...editing, style: e.target.value })}
                placeholder="e.g. short sentences, first person, punchy"
              />
            </Field>

            <Field label="Avoid" hint="What should never appear?">
              <input
                value={editing.avoid ?? ""}
                onChange={(e) => setEditing({ ...editing, avoid: e.target.value })}
                placeholder="e.g. emojis, buzzwords, corporate language, hype"
              />
            </Field>

            <Field label="Target audience">
              <input
                value={editing.target_audience ?? ""}
                onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })}
                placeholder="e.g. active crypto traders, DeFi users"
              />
            </Field>

            <SectionDivider label="Content" />

            <Field label="Content pillars" hint="Default topics to research (comma-separated)">
              <input
                value={(editing.content_pillars ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({ ...editing, content_pillars: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="e.g. crypto perps, self-custody, RWA trading"
              />
            </Field>

            <Field label="Default subreddits" hint="Comma-separated">
              <input
                value={(editing.default_subreddits ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({ ...editing, default_subreddits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="e.g. CryptoCurrency, trading, DeFi"
              />
            </Field>

            <SectionDivider label="Posting Schedule" />

            <Field label="Posting days">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    style={{
                      padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
                      background: editing.posting_days?.includes(d) ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1px solid ${editing.posting_days?.includes(d) ? "var(--accent-border)" : "var(--border-2)"}`,
                      color: editing.posting_days?.includes(d) ? "var(--accent-light)" : "var(--text-muted)",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Posting times" hint="Comma-separated, 24h format">
              <input
                value={(editing.posting_times ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({ ...editing, posting_times: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="e.g. 09:00, 17:00"
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "32px" }}>
            <button
              onClick={save}
              disabled={saving || !editing.name?.trim()}
              style={{ padding: "12px 28px", background: "var(--accent)", color: "#fff", fontSize: "14px", fontWeight: 500, borderRadius: "10px", border: "none", cursor: "pointer", opacity: (saving || !editing.name?.trim()) ? 0.4 : 1, transition: "opacity 0.15s" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{ padding: "12px 24px", background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text-dim)", fontSize: "14px", borderRadius: "10px", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "4px" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, fontFamily: "monospace", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
        {label}
        {hint && <span style={{ textTransform: "none", letterSpacing: "normal", marginLeft: "8px", color: "var(--text-subtle)", fontWeight: 400 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
