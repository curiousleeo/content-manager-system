"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface UsageStat {
  service: string;
  label: string;
  count: number;
  limit: number;
  pct: number;
}

export default function UsageStatus() {
  const [usage, setUsage] = useState<UsageStat[]>([]);

  const load = useCallback(async () => {
    try {
      const { store } = await import("@/lib/store");
      const project = store.getProject();
      const data = await api.notifications.list(project?.id ?? undefined);
      setUsage(data.usage);
    } catch { /* backend offline */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  if (usage.length === 0) return null;

  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
      <p style={{
        fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "var(--text-subtle)", marginBottom: "10px",
      }}>
        API Usage
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {usage.map((u) => {
          const warn = u.pct >= 90;
          const barColor = warn ? "var(--amber)" : "var(--accent)";
          return (
            <div key={u.service}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: warn ? "var(--amber-text)" : "var(--text-muted)" }}>
                  {u.label}
                </span>
                <span style={{ fontSize: "10px", fontFamily: "monospace", color: warn ? "var(--amber-text)" : "var(--text-subtle)" }}>
                  {u.pct.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: "3px", borderRadius: "9999px", background: "var(--surface-4)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: "9999px",
                  width: `${Math.min(u.pct, 100)}%`,
                  background: barColor,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
