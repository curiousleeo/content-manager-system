import { auth, signOut } from "@/auth";
import { Search, Bell, Settings } from "lucide-react";

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : session.user.email?.[0].toUpperCase() ?? "U";

  return (
    <header
      className="h-14 shrink-0 flex items-center gap-4 px-6"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Search */}
      <div className="flex-1 max-w-lg relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Topic, task, account, publication..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Bell */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          <Bell size={15} />
        </button>

        {/* Settings */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          <Settings size={15} />
        </button>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: "var(--border)" }} />

        {/* Avatar + signout */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {initials}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs transition-colors hover:text-slate-200"
              style={{ color: "var(--text-muted)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
