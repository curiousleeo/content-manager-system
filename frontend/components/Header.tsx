import { auth } from "@/auth";
import PageLabel from "./PageLabel";
import NotificationBell from "./NotificationBell";

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const rawName = session.user.name ?? session.user.email ?? "";
  const initials = rawName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

  return (
    <header
      className="shrink-0 flex items-center justify-between"
      style={{
        height: "58px",
        padding: "0 30px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,15,0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: page label */}
      <div className="flex items-center gap-4">
        <PageLabel />
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        <div
          className="flex items-center justify-center"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "7px",
            background: "linear-gradient(135deg, var(--gold), var(--purple))",
            color: "#1a1000",
            fontSize: "10px",
            fontWeight: 700,
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
