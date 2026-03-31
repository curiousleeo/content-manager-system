import Link from "next/link";
import { auth } from "@/auth";
import Breadcrumb from "./Breadcrumb";

function CurrentDate() {
  const label = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  return (
    <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-subtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {label}
    </span>
  );
}

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header
      className="shrink-0 flex items-center justify-between"
      style={{ height: "60px", padding: "0 32px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-center gap-6">
        <Breadcrumb />
        <CurrentDate />
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/schedule"
          className="transition-all hover:bg-white/[0.07]"
          style={{
            fontSize: "13px", fontWeight: 500,
            padding: "7px 16px", borderRadius: "8px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-2)",
            color: "var(--text-muted)",
          }}
        >
          View calendar
        </Link>
        <button
          className="transition-all hover:bg-white/[0.07]"
          style={{
            fontSize: "13px", fontWeight: 500,
            padding: "7px 16px", borderRadius: "8px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-2)",
            color: "var(--text-muted)",
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Import draft
        </button>
        <Link
          href="/research"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{
            fontSize: "13px", fontWeight: 500,
            padding: "7px 18px", borderRadius: "8px",
            background: "var(--accent)", color: "#fff",
          }}
        >
          <span style={{ fontSize: "17px", lineHeight: 1, marginTop: "-1px" }}>+</span>
          New post
        </Link>
      </div>
    </header>
  );
}
