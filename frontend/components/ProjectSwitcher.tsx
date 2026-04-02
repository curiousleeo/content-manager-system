"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";
import { store, type Project } from "@/lib/store";

export default function ProjectSwitcher() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(store.getProject());
    api.projects.list().then((res) => {
      const list = (res as { projects: Project[] }).projects;
      setProjects(list);
      // Auto-select first project if none stored
      if (!store.getProject() && list.length > 0) {
        store.setProject(list[0]);
        setActive(list[0]);
      }
    }).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(p: Project) {
    store.setProject(p);
    setActive(p);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ padding: "0 10px 8px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border-2)",
          background: open ? "var(--surface-3)" : "var(--surface-2)",
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "var(--surface-3)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "var(--surface-2)"; }}
      >
        <FolderOpen size={13} style={{ flexShrink: 0, color: "var(--accent)" }} />
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: "var(--text)", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.name ?? "No project"}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, color: "var(--text-subtle)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          left: "10px", right: "10px",
          marginTop: "4px",
          borderRadius: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          zIndex: 200,
          overflow: "hidden",
        }}>
          {projects.length === 0 ? (
            <button
              onClick={() => { setOpen(false); router.push("/projects"); }}
              style={{ width: "100%", padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              Create a project →
            </button>
          ) : (
            <>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => select(p)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 16px", fontSize: "13px",
                    background: active?.id === p.id ? "var(--accent-dim)" : "transparent",
                    color: active?.id === p.id ? "var(--accent-light)" : "var(--text-muted)",
                    border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (active?.id !== p.id) e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (active?.id !== p.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  {active?.id === p.id && <Check size={12} style={{ flexShrink: 0 }} />}
                </button>
              ))}
              <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
              <button
                onClick={() => { setOpen(false); router.push("/projects"); }}
                style={{ width: "100%", padding: "10px 16px", fontSize: "11px", fontFamily: "monospace", color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-subtle)"; }}
              >
                Manage projects →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
