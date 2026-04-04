import { auth } from "@/auth";
import PageLabel from "./PageLabel";
import NotificationBell from "./NotificationBell";

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const rawName = session.user.name ?? session.user.email ?? "";
  const name = rawName.includes("@") ? rawName.split("@")[0] : rawName;
  const initials = rawName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className="shrink-0 flex items-center justify-between"
      style={{
        height: "60px",
        padding: "0 32px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,15,0.92)",
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

      {/* Right: bell + user */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        <div
          style={{
            width: "1px", height: "20px",
            background: "var(--border)",
          }}
        />

        <div className="flex items-center gap-2.5">
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--t1)", lineHeight: 1 }}>
              {name}
            </p>
            <p style={{
              fontSize: "9px", fontWeight: 600,
              color: "var(--gold)", letterSpacing: "0.8px",
              textTransform: "uppercase", marginTop: "3px", lineHeight: 1,
            }}>
              Admin
            </p>
          </div>

          <div
            className="flex items-center justify-center"
            style={{
              width: "28px", height: "28px", borderRadius: "7px",
              background: "linear-gradient(135deg, var(--gold), var(--purple))",
              color: "#1a1000", fontSize: "10px", fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
