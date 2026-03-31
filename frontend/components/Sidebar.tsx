"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Lightbulb, PenLine,
  CheckCircle, CalendarClock, FolderOpen, History,
  Zap, Plus,
} from "lucide-react";

const manage = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects",  icon: FolderOpen      },
  { href: "/history",  label: "History",   icon: History         },
];

const pipeline = [
  { href: "/research", label: "Research", icon: Search,        step: 1 },
  { href: "/insights", label: "Insights", icon: Lightbulb,     step: 2 },
  { href: "/content",  label: "Generate", icon: PenLine,       step: 3 },
  { href: "/review",   label: "Review",   icon: CheckCircle,   step: 4 },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, step: 5 },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-100 relative"
      style={{
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "var(--text)" : "var(--text-dim)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {active && (
        <div
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full"
          style={{ background: "var(--accent)" }}
        />
      )}
      <Icon size={15} strokeWidth={active ? 2 : 1.75} style={{ opacity: active ? 1 : 0.65 }} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full select-none"
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={12} color="#fff" fill="#fff" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            CMS
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-6">
        {/* Overview */}
        <nav className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] px-3 mb-2" style={{ color: "var(--text-subtle)" }}>
            Overview
          </p>
          {manage.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        {/* Pipeline */}
        <nav className="flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] px-3 mb-2" style={{ color: "var(--text-subtle)" }}>
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>
      </div>

      {/* New Post */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <Link
          href="/research"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New post</span>
        </Link>
      </div>
    </aside>
  );
}
