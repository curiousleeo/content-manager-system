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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-1">Projects</h2>
          <p className="text-zinc-400 text-sm">Each project has its own voice, schedule, and content pillars.</p>
        </div>
        <button
          onClick={() => { setEditing(empty()); setIsNew(true); }}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          New project
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 font-mono">{error}</p>}

      {/* Project list */}
      {!editing && (
        <div className="flex flex-col gap-3">
          {projects.length === 0 && (
            <p className="text-zinc-600 text-sm">No projects yet. Create one to get started.</p>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className={`border rounded-lg p-4 transition-colors ${
                activeProject?.id === p.id
                  ? "border-zinc-400 bg-zinc-900"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-zinc-100">{p.name}</p>
                    {activeProject?.id === p.id && (
                      <span className="text-xs font-mono text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
                        active
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-zinc-500 text-sm mb-2">{p.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-600 font-mono">
                    {p.tone && <span>tone: {p.tone.slice(0, 40)}{p.tone.length > 40 ? "…" : ""}</span>}
                    {p.content_pillars?.length ? <span>pillars: {p.content_pillars.slice(0, 3).join(", ")}</span> : null}
                    {p.posting_days?.length ? <span>posts: {p.posting_days.join(", ")}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => activate(p)}
                    disabled={activeProject?.id === p.id}
                    className="text-xs px-3 py-1.5 border border-zinc-700 rounded hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {activeProject?.id === p.id ? "Active" : "Select"}
                  </button>
                  <button
                    onClick={() => { setEditing(p); setIsNew(false); }}
                    className="text-xs px-3 py-1.5 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-xs px-3 py-1.5 border border-zinc-800 rounded hover:border-red-900 hover:text-red-400 text-zinc-600 transition-colors"
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
        <div className="border border-zinc-800 rounded-lg p-6">
          <h3 className="font-medium mb-6">{isNew ? "New project" : `Edit — ${editing.name}`}</h3>

          <div className="flex flex-col gap-5">
            {/* Name */}
            <Field label="Project name *">
              <input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. GTR Trade, Personal Brand"
                className={inputCls}
              />
            </Field>

            <Field label="Description">
              <input
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="What is this project about?"
                className={inputCls}
              />
            </Field>

            <hr className="border-zinc-800" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide">Brand Voice</p>

            <Field label="Tone" hint="How should it sound?">
              <input
                value={editing.tone ?? ""}
                onChange={(e) => setEditing({ ...editing, tone: e.target.value })}
                placeholder="e.g. direct, trader-to-trader, no hype"
                className={inputCls}
              />
            </Field>

            <Field label="Style" hint="How should it be written?">
              <input
                value={editing.style ?? ""}
                onChange={(e) => setEditing({ ...editing, style: e.target.value })}
                placeholder="e.g. short sentences, first person, punchy"
                className={inputCls}
              />
            </Field>

            <Field label="Avoid" hint="What should never appear?">
              <input
                value={editing.avoid ?? ""}
                onChange={(e) => setEditing({ ...editing, avoid: e.target.value })}
                placeholder="e.g. emojis, buzzwords, corporate language, hype"
                className={inputCls}
              />
            </Field>

            <Field label="Target audience">
              <input
                value={editing.target_audience ?? ""}
                onChange={(e) => setEditing({ ...editing, target_audience: e.target.value })}
                placeholder="e.g. active crypto traders, DeFi users"
                className={inputCls}
              />
            </Field>

            <hr className="border-zinc-800" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide">Content</p>

            <Field label="Content pillars" hint="Default topics to research (comma-separated)">
              <input
                value={(editing.content_pillars ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    content_pillars: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="e.g. crypto perps, self-custody, RWA trading"
                className={inputCls}
              />
            </Field>

            <Field label="Default subreddits" hint="Comma-separated">
              <input
                value={(editing.default_subreddits ?? []).join(", ")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    default_subreddits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="e.g. CryptoCurrency, trading, DeFi"
                className={inputCls}
              />
            </Field>

            <hr className="border-zinc-800" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide">Posting Schedule</p>

            <Field label="Posting days">
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded border text-sm font-mono transition-colors ${
                      editing.posting_days?.includes(d)
                        ? "border-zinc-400 text-zinc-100 bg-zinc-800"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-600"
                    }`}
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
                  setEditing({
                    ...editing,
                    posting_times: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="e.g. 09:00, 17:00"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={save}
              disabled={saving || !editing.name?.trim()}
              className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 border border-zinc-700 text-sm rounded hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 font-mono mb-1 uppercase tracking-wide">
        {label}
        {hint && <span className="normal-case tracking-normal ml-2 text-zinc-600">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
