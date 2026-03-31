"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Lightbulb, PenLine,
  CheckCircle, CalendarClock, FolderOpen, History, LogOut,
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

interface User { name: string; initials: string; }
interface Props { user?: User | null; signOutAction?: () => Promise<void>; }

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg transition-all duration-100"
      style={{
        padding: "9px 12px",
        background: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent-light)" : "rgba(255,255,255,0.5)",
        fontWeight: active ? 500 : 400,
        fontSize: "13.5px",
      }}
    >
      <Icon
        size={17}
        strokeWidth={active ? 2 : 1.75}
        style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}
      />
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
      style={{ width: "240px", minWidth: "240px", borderRight: "1px solid var(--border)", background: "var(--sidebar)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{ height: "60px", padding: "0 20px", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0 text-[11px] font-bold tracking-wide"
          style={{
            width: "32px", height: "32px",
            background: "linear-gradient(135deg, #7f77dd 0%, #534ab7 100%)",
            color: "#fff",
          }}
        >
          CMS
        </div>
        <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--text)" }}>
          Content Manager
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6" style={{ padding: "20px 10px" }}>
        <nav className="flex flex-col gap-1">
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 12px", marginBottom: "6px" }}>
            Overview
          </p>
          {manage.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        <nav className="flex flex-col gap-1">
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 12px", marginBottom: "6px" }}>
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>
      </div>

      {/* User */}
      {user && (
        <div className="shrink-0" style={{ borderTop: "1px solid var(--border)", padding: "12px 10px" }}>
          <div className="flex items-center gap-3" style={{ padding: "8px 12px", borderRadius: "10px" }}>
            <div
              className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold"
              style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #7f77dd, #3c3489)", color: "#fff" }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: "13.5px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                {user.name}
              </p>
              <p style={{ fontSize: "11.5px", color: "var(--text-subtle)", marginTop: "1px" }}>Admin · GTR</p>
            </div>
            {signOutAction && (
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sign out"
                  className="flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.08]"
                  style={{ width: "28px", height: "28px", color: "var(--text-subtle)" }}
                >
                  <LogOut size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
