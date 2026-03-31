"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Lightbulb, PenLine,
  CheckCircle, CalendarClock, FolderOpen, History,
  Zap,
} from "lucide-react";

const manage = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects",  icon: FolderOpen      },
  { href: "/history",  label: "History",   icon: History         },
];

const pipeline = [
  { href: "/research", label: "Research",  icon: Search,        step: 1 },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     step: 2 },
  { href: "/content",  label: "Generate",  icon: PenLine,       step: 3 },
  { href: "/review",   label: "Review",    icon: CheckCircle,   step: 4 },
  { href: "/schedule", label: "Schedule",  icon: CalendarClock, step: 5 },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="w-[200px] shrink-0 flex flex-col h-full select-none"
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--accent)", opacity: 0.9 }}
          >
            <Zap size={12} color="#fff" fill="#fff" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            CMS
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-5">
        {/* Overview */}
        <nav className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 mb-1.5" style={{ color: "var(--text-subtle)" }}>
            Overview
          </p>
          {manage.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-100"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Pipeline */}
        <nav className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 mb-1.5" style={{ color: "var(--text-subtle)" }}>
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon: Icon, step }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-100"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.75} />
                <span className="flex-1">{label}</span>
                <span
                  className="text-[10px] font-mono tabular-nums"
                  style={{ color: active ? "var(--text-muted)" : "var(--text-subtle)" }}
                >
                  0{step}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* New Post */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href="/research"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-md text-[13px] font-medium transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <span>+ New post</span>
        </Link>
      </div>
    </aside>
  );
}
