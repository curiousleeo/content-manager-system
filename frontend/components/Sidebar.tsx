"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Lightbulb,
  PenLine,
  CheckCircle,
  CalendarClock,
  FolderOpen,
  History,
  Plus,
} from "lucide-react";

const pipeline = [
  { href: "/research", label: "Research",  icon: Search,         step: "01" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,      step: "02" },
  { href: "/content",  label: "Generate",  icon: PenLine,        step: "03" },
  { href: "/review",   label: "Review",    icon: CheckCircle,    step: "04" },
  { href: "/schedule", label: "Schedule",  icon: CalendarClock,  step: "05" },
];

const manage = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects",  icon: FolderOpen      },
  { href: "/history",  label: "History",   icon: History         },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      className="w-52 shrink-0 flex flex-col py-5 px-3 gap-0"
    >
      {/* Logo */}
      <div className="px-3 mb-6">
        <span className="text-sm font-bold tracking-widest" style={{ color: "var(--blue)" }}>
          CMS
        </span>
      </div>

      {/* Overview section */}
      <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5" style={{ color: "var(--text-muted)" }}>
        Overview
      </p>
      <nav className="flex flex-col gap-0.5 mb-5">
        {manage.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: active ? "var(--blue-dim)" : "transparent",
                color: active ? "var(--blue)" : "var(--text-dim)",
                borderLeft: active ? "2px solid var(--blue)" : "2px solid transparent",
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Pipeline section */}
      <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5" style={{ color: "var(--text-muted)" }}>
        Pipeline
      </p>
      <nav className="flex flex-col gap-0.5 mb-auto">
        {pipeline.map(({ href, label, icon: Icon, step }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: active ? "var(--blue-dim)" : "transparent",
                color: active ? "var(--blue)" : "var(--text-dim)",
                borderLeft: active ? "2px solid var(--blue)" : "2px solid transparent",
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              <span className="text-[10px] font-mono" style={{ color: active ? "var(--blue)" : "var(--text-muted)" }}>
                {step}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* New post button */}
      <div className="mt-4 px-1">
        <Link
          href="/research"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          <Plus size={14} />
          New Post
        </Link>
      </div>
    </aside>
  );
}
