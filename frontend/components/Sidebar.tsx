"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Search, Lightbulb, PenLine,
  CheckCircle, Calendar, Folder, History, LogOut, Target,
  CalendarDays, BarChart2, Settings, HelpCircle, Plus,
} from "lucide-react";
import UsageStatus from "./UsageStatus";
import ProjectSwitcher from "./ProjectSwitcher";

const manage = [
  { href: "/",          label: "Dashboard", icon: LayoutGrid   },
  { href: "/projects",  label: "Projects",  icon: Folder       },
  { href: "/history",   label: "History",   icon: History      },
  { href: "/calendar",  label: "Calendar",  icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart2    },
];

const pipeline = [
  { href: "/research", label: "Research",    icon: Search      },
  { href: "/insights", label: "Insights",    icon: Lightbulb   },
  { href: "/content",  label: "Generate",    icon: PenLine     },
  { href: "/review",   label: "Review",      icon: CheckCircle },
  { href: "/schedule", label: "Schedule",    icon: Calendar    },
  { href: "/niche",    label: "Niche Intel", icon: Target      },
];

interface User { name: string; initials: string; }
interface Props { user?: User | null; signOutAction?: () => Promise<void>; }

const NI_STYLE: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 500,
  padding: "9px 10px",
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  textDecoration: "none",
  transition: "color 0.1s, background 0.1s",
};

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        ...NI_STYLE,
        color:       active ? "var(--gold)"             : "var(--ti)",
        background:  active ? "rgba(255,184,0,0.07)"    : "transparent",
        borderRight: active ? "2px solid var(--gold)"   : "2px solid transparent",
        fontWeight:  active ? 600                       : 500,
      }}
    >
      <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {label}
    </Link>
  );
}

export default function Sidebar({ user, signOutAction }: Props) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="flex flex-col h-full select-none"
      style={{
        width: "220px", minWidth: "220px",
        borderRight: "1px solid var(--border)",
        background: "var(--bg-base)",
        boxShadow: "8px 0 32px rgba(0,0,0,0.45)",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "26px 13px 20px" }}>
        <div style={{ marginBottom: "34px" }}>
          <p style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 800, fontSize: "20px",
            color: "var(--gold)", letterSpacing: "-1px",
            lineHeight: 1,
          }}>
            CMS
          </p>
          <p style={{
            fontSize: "9px", letterSpacing: "2.5px",
            textTransform: "uppercase", color: "var(--t3)",
            marginTop: "4px",
          }}>
            SOVEREIGN ADMIN
          </p>
        </div>

        {/* Create New Post */}
        <Link
          href="/content"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "6px", width: "100%",
            background: "var(--gold)", color: "#1a1000",
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 700, fontSize: "11.5px",
            padding: "10px 16px", borderRadius: "8px",
            textDecoration: "none", letterSpacing: "0.3px",
            transition: "box-shadow 0.15s",
            marginBottom: "8px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 18px rgba(255,184,0,0.25)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <Plus size={12} strokeWidth={2.5} style={{ color: "#1a1000" }} />
          Create New Post
        </Link>
      </div>

      {/* Project switcher */}
      <div style={{ padding: "0 13px 4px", borderBottom: "1px solid var(--border)" }}>
        <ProjectSwitcher />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "12px 13px" }}>
        <nav className="flex flex-col" style={{ marginBottom: "4px" }}>
          <p style={{
            fontSize: "9px", fontWeight: 600, color: "var(--t3)",
            letterSpacing: "1.5px", textTransform: "uppercase",
            padding: "0 10px", marginBottom: "6px",
          }}>
            Overview
          </p>
          {manage.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        <div style={{ height: "1px", background: "var(--border)", margin: "10px 0" }} />

        <nav className="flex flex-col">
          <p style={{
            fontSize: "9px", fontWeight: 600, color: "var(--t3)",
            letterSpacing: "1.5px", textTransform: "uppercase",
            padding: "0 10px", marginBottom: "6px",
          }}>
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        <div style={{ height: "1px", background: "var(--border)", margin: "10px 0" }} />

        <nav className="flex flex-col gap-0.5">
          {[
            { href: "/settings", label: "Settings", icon: Settings },
            { href: "/support",  label: "Support",  icon: HelpCircle },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              style={{ ...NI_STYLE, color: "var(--ti)" }}
            >
              <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* API Usage */}
      <UsageStatus />

      {/* User */}
      {user && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 13px" }}>
          <div className="flex items-center gap-3" style={{ padding: "8px 10px", borderRadius: "8px" }}>
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: "28px", height: "28px", borderRadius: "7px",
                background: "linear-gradient(135deg, var(--gold), var(--purple))",
                color: "#1a1000", fontSize: "10px", fontWeight: 700,
              }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: "11px", fontWeight: 600, color: "var(--t1)" }}>
                {user.name}
              </p>
              <p style={{ fontSize: "9px", fontWeight: 600, color: "var(--gold)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: "1px" }}>
                Admin
              </p>
            </div>
            {signOutAction && (
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sign out"
                  className="flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.08]"
                  style={{ width: "26px", height: "26px", color: "var(--t3)", cursor: "pointer", background: "none", border: "none" }}
                >
                  <LogOut size={13} strokeWidth={1.75} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
