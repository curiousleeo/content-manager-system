"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { store, type Project } from "@/lib/store";

export default function ProjectSwitcher() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActive(store.getProject());
    api.projects.list().then((res) => {
      setProjects((res as { projects: Project[] }).projects);
    }).catch(() => {});
  }, []);

  function select(p: Project) {
    store.setProject(p);
    setActive(p);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500 text-sm transition-colors"
      >
        <span className="text-zinc-400 font-mono text-xs">project</span>
        <span className="text-zinc-200 max-w-32 truncate">
          {active?.name ?? "None"}
        </span>
        <span className="text-zinc-600">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1">
          {projects.length === 0 ? (
            <button
              onClick={() => { setOpen(false); router.push("/projects"); }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Create a project →
            </button>
          ) : (
            <>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => select(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    active?.id === p.id
                      ? "text-zinc-100 bg-zinc-800"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {p.name}
                </button>
              ))}
              <hr className="border-zinc-800 my-1" />
              <button
                onClick={() => { setOpen(false); router.push("/projects"); }}
                className="w-full text-left px-4 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
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
