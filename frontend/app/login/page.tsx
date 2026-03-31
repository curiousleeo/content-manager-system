import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      {/* Radial glow top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.1), transparent 70%)",
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo badge */}
        <div className="flex justify-center mb-6">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--blue-dim)",
              color: "var(--blue)",
              border: "1px solid var(--blue-border)",
            }}
          >
            CMS
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold mb-1.5" style={{ color: "var(--text)" }}>
            Content Manager
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            continue with
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Google button */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "#fff",
              color: "#1a1a1a",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: "var(--text-muted)" }}>
          Access restricted to authorized accounts only.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
