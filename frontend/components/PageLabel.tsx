"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, { label: string; gold?: boolean }> = {
  "/":          { label: "DASHBOARD" },
  "/research":  { label: "RESEARCH",    gold: true },
  "/insights":  { label: "INSIGHTS",    gold: true },
  "/content":   { label: "GENERATE",    gold: true },
  "/review":    { label: "REVIEW",      gold: true },
  "/schedule":  { label: "SCHEDULE",    gold: true },
  "/projects":  { label: "PROJECTS",    gold: true },
  "/history":   { label: "HISTORY",     gold: true },
  "/calendar":  { label: "CALENDAR",    gold: true },
  "/analytics": { label: "ANALYTICS",   gold: true },
  "/niche":     { label: "NICHE INTEL", gold: true },
  "/settings":  { label: "SETTINGS",    gold: true },
};

export default function PageLabel() {
  const pathname = usePathname();
  const entry =
    Object.entries(LABELS).find(([k]) =>
      k === "/" ? pathname === "/" : pathname.startsWith(k)
    )?.[1] ?? { label: "CMS", gold: false };

  return (
    <span
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        fontWeight: 600,
        fontSize: "11px",
        letterSpacing: "2.8px",
        textTransform: "uppercase",
        color: entry.gold ? "var(--gold)" : "var(--t2)",
      }}
    >
      {entry.label}
    </span>
  );
}
