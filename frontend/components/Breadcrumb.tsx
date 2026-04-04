"use client";

import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  "/":          "Dashboard",
  "/research":  "Research",
  "/insights":  "Insights",
  "/content":   "Generate",
  "/review":    "Review",
  "/schedule":  "Schedule",
  "/projects":  "Projects",
  "/history":   "History",
  "/calendar":  "Calendar",
  "/analytics": "Analytics",
  "/niche":     "Niche Intel",
  "/settings":  "Settings",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const label =
    Object.entries(LABELS).find(([k]) =>
      k === "/" ? pathname === "/" : pathname.startsWith(k)
    )?.[1] ?? "Page";

  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span style={{ color: "var(--t3)" }}>CMS</span>
      <span style={{ color: "var(--t3)" }}>›</span>
      <span style={{ color: "var(--t1)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
