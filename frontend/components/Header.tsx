import { auth, signOut } from "@/auth";

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const name = session.user.name ?? session.user.email ?? "User";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header
      className="h-[52px] shrink-0 flex items-center justify-between px-6"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(13,13,13,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left: breadcrumb placeholder */}
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Content Manager</span>
      </div>

      {/* Right: avatar + user */}
      <div className="flex items-center gap-3">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-[12px] px-3 py-1.5 rounded-md transition-all hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {initials}
          </div>
          <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>
            {name.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
