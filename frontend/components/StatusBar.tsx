"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";

export default function StatusBar() {
  const [queued, setQueued] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await api.scheduler.list() as { posts: { status: string }[] };
        const count = r.posts.filter((p) => p.status === "scheduled").length;
        setQueued(count);
      } catch { /* backend offline */ }
    }
    load();
  }, []);

  const project = store.getProject();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "220px",
        right: 0,
        height: "28px",
        background: "var(--bg-mid)",
        borderTop: "1px solid var(--border)",
        padding: "0 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "var(--green)",
            boxShadow: "0 0 6px var(--green)",
          }} />
          <span style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--green)",
          }}>
            System Live
          </span>
        </div>

        <div style={{ width: "1px", height: "11px", background: "var(--border)" }} />

        <span style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: "var(--t3)",
        }}>
          {queued !== null
            ? `${queued} draft${queued !== 1 ? "s" : ""} queued for auto-poster`
            : "Loading queue…"}
          {project ? ` · ${project.name}` : ""}
        </span>
      </div>

      {/* Right */}
      <span style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "9px",
        color: "var(--t3)",
      }}>
        V 4.2.0-SOVEREIGN
      </span>
    </div>
  );
}
