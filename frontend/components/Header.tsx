import Link from "next/link";
import { auth } from "@/auth";
import Breadcrumb from "./Breadcrumb";

function CurrentDate() {
  const label = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  return (
    <span
      className="text-[11px] font-medium uppercase"
      style={{ color: "var(--text-subtle)", letterSpacing: "0.07em" }}
    >
      {label}
    </span>
  );
}

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header
      className="h-[52px] shrink-0 flex items-center justify-between px-8"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Left: breadcrumb + date */}
      <div className="flex items-center gap-5">
        <Breadcrumb />
        <CurrentDate />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/schedule"
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.07]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-2)",
            color: "var(--text-muted)",
          }}
        >
          View calendar
        </Link>
        <button
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.07]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-2)",
            color: "var(--text-muted)",
          }}
        >
          Import draft
        </button>
        <Link
          href="/research"
          className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
          New post
        </Link>
      </div>
    </header>
  );
}
