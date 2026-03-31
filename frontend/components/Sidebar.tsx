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
  { href: "/research", label: "Research", icon: Search        },
  { href: "/insights", label: "Insights", icon: Lightbulb     },
  { href: "/content",  label: "Generate", icon: PenLine       },
  { href: "/review",   label: "Review",   icon: CheckCircle   },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
];

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] transition-all duration-100 relative"
      style={{
        background: active ? "rgba(255,255,255,0.07)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {active && (
        <div
          className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full"
          style={{ background: "var(--accent)" }}
        />
      )}
      <Icon
        size={14}
        strokeWidth={active ? 2 : 1.75}
        style={{ color: active ? "var(--text)" : "var(--text-muted)", opacity: active ? 1 : 0.7 }}
      />
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
      <div
        className="h-[52px] flex items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 12px rgba(167,139,250,0.35)",
            }}
          >
            <Zap size={13} color="#fff" fill="#fff" />
          </div>
          <span
            className="text-[13.5px] font-semibold tracking-tight"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
          >
            CMS
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-6">
        <nav className="flex flex-col gap-0.5">
          <p
            className="text-[10px] font-bold uppercase px-3 mb-2"
            style={{ color: "var(--text-subtle)", letterSpacing: "0.12em" }}
          >
            Overview
          </p>
          {manage.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        <nav className="flex flex-col gap-0.5">
          <p
            className="text-[10px] font-bold uppercase px-3 mb-2"
            style={{ color: "var(--text-subtle)", letterSpacing: "0.12em" }}
          >
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>
      </div>

      {/* New Post CTA */}
      <div
        className="p-3 shrink-0 relative"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* Glow behind button */}
        <div
          className="absolute inset-3 rounded-lg pointer-events-none"
          style={{
            background: "var(--accent)",
            opacity: 0.15,
            filter: "blur(12px)",
          }}
        />
        <Link
          href="/research"
          className="relative flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New post
        </Link>
      </div>
    </aside>
  );
}
