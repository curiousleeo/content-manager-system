"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Search, Lightbulb, PenLine,
  CheckCircle, Calendar, CalendarDays, History,
  BarChart2, Target, Folder, Settings, HelpCircle, Plus,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",         icon: LayoutGrid   },
  { href: "/research",  label: "Research",           icon: Search       },
  { href: "/insights",  label: "Insights",           icon: Lightbulb    },
  { href: "/content",   label: "Content",            icon: PenLine      },
  { href: "/review",    label: "Review",             icon: CheckCircle  },
  { href: "/schedule",  label: "Schedule",           icon: Calendar     },
  { href: "/calendar",  label: "Calendar",           icon: CalendarDays },
  { href: "/history",   label: "History",            icon: History      },
  { href: "/analytics", label: "Analytics",          icon: BarChart2    },
  { href: "/niche",     label: "Niche Intelligence", icon: Target       },
  { href: "/projects",  label: "Projects",           icon: Folder       },
];

interface Props {
  user?: { name: string; initials: string } | null;
  signOutAction?: () => Promise<void>;
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "8px 9px",
        borderRadius: "8px",
        cursor: "pointer",
        color: active ? "var(--gold)" : "var(--ti)",
        background: active ? "rgba(255,184,0,0.07)" : "transparent",
        borderLeft: `2px solid ${active ? "var(--gold)" : "transparent"}`,
        paddingLeft: active ? "7px" : "9px",
        fontSize: "12.5px",
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {label}
    </Link>
  );
}

export default function Sidebar({ signOutAction }: Props) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="select-none"
      style={{
        width: "220px",
        minWidth: "220px",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        padding: "22px 12px",
        boxShadow: "8px 0 32px rgba(0,0,0,0.5), inset -1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 6px", marginBottom: "28px" }}>
        <div style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontWeight: 800,
          fontSize: "20px",
          color: "var(--gold)",
          letterSpacing: "-1px",
        }}>
          CMS
        </div>
        <div style={{
          fontSize: "9px",
          color: "var(--t3)",
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          marginTop: "2px",
        }}>
          Sovereign Admin
        </div>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{ display: "flex", flexDirection: "column", gap: "1px" }}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} />
        ))}
      </nav>

      {/* Bottom */}
      <div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "10px 0" }} />

        <Link
          href="/content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            background: "var(--gold)",
            color: "#1a1000",
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 700,
            fontSize: "11.5px",
            padding: "10px",
            borderRadius: "8px",
            textDecoration: "none",
            width: "100%",
            marginBottom: "8px",
            transition: "opacity 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 18px rgba(255,184,0,0.25)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <Plus size={12} strokeWidth={2.5} style={{ color: "#1a1000" }} />
          Create New Post
        </Link>

        {[
          { href: "/settings", label: "Settings",  icon: Settings   },
          { href: "/support",  label: "Support",   icon: HelpCircle },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "8px 9px",
              borderRadius: "8px",
              color: "var(--ti)",
              fontSize: "12.5px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color 0.15s, background 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {label}
          </Link>
        ))}

        {/* Sign-out (minimal, hidden unless user present) */}
        {signOutAction && (
          <form action={signOutAction} style={{ marginTop: "6px" }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                color: "var(--t3)",
                textAlign: "left",
                letterSpacing: "0.5px",
              }}
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
