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

interface Props {
  user?: User | null;
  signOutAction?: () => Promise<void>;
}

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-100"
      style={{
        background: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent-light)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2 : 1.75}
        style={{ opacity: active ? 1 : 0.7 }}
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
      className="w-[240px] shrink-0 flex flex-col h-full select-none"
      style={{ borderRight: "1px solid var(--border)", background: "var(--sidebar)" }}
    >
      {/* Logo */}
      <div
        className="h-[52px] flex items-center px-5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[11px] font-semibold tracking-wide shrink-0"
            style={{
              background: "linear-gradient(135deg, #7f77dd 0%, #534ab7 100%)",
              color: "#fff",
            }}
          >
            CMS
          </div>
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--text)" }}
          >
            Content Manager
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
        <nav className="flex flex-col gap-0.5">
          <p
            className="text-[10px] font-semibold uppercase px-2.5 mb-2"
            style={{ color: "var(--text-subtle)", letterSpacing: "0.09em" }}
          >
            Overview
          </p>
          {manage.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>

        <nav className="flex flex-col gap-0.5">
          <p
            className="text-[10px] font-semibold uppercase px-2.5 mb-2"
            style={{ color: "var(--text-subtle)", letterSpacing: "0.09em" }}
          >
            Pipeline
          </p>
          {pipeline.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </nav>
      </div>

      {/* User profile */}
      {user && (
        <div
          className="p-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
              style={{
                background: "linear-gradient(135deg, #7f77dd, #3c3489)",
                color: "#fff",
              }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium truncate"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {user.name}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                Admin · GTR
              </p>
            </div>
            {signOutAction && (
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sign out"
                  className="p-1.5 rounded-md transition-colors hover:bg-white/[0.08]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  <LogOut size={13} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
