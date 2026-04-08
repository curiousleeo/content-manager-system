import { signIn } from "@/auth";

export default function LoginPage() {
  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        background: "#0A0A0F",
        color: "#e4e1e9",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* ── Purple atmosphere orb ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(107,47,217,0.18) 0%, rgba(107,47,217,0.06) 50%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ══════════════════════════════
          NAV
      ══════════════════════════════ */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          height: "60px",
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 800,
              fontSize: "17px",
              color: "#FFB800",
              letterSpacing: "-0.5px",
            }}
          >
            sovereign
          </span>
          <span
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 400,
              fontSize: "17px",
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "-0.5px",
            }}
          >
            cms
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {["Features", "Research", "Insights"].map((label) => (
            <a
              key={label}
              href="#"
              style={{
                fontSize: "13.5px",
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <form action={handleSignIn}>
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: 500,
                padding: "7px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              Sign In
            </button>
          </form>
          <form action={handleSignIn}>
            <button
              type="submit"
              style={{
                background: "#FFB800",
                border: "none",
                color: "#1a1000",
                fontSize: "13px",
                fontWeight: 700,
                padding: "7px 18px",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "var(--font-manrope), sans-serif",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 20px rgba(255,184,0,0.2)",
                transition: "box-shadow 0.15s",
              }}
            >
              Get Started
            </button>
          </form>
        </div>
      </nav>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "100px 48px 80px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 800,
            fontSize: "clamp(42px, 6vw, 72px)",
            lineHeight: 1.08,
            letterSpacing: "-2.5px",
            margin: "0 0 24px",
            color: "#e4e1e9",
          }}
        >
          Command Your{" "}
          <span style={{ color: "#FFB800" }}>Digital</span>
          {" "}Sovereignty.
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 1.4vw, 18px)",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.7,
            maxWidth: "560px",
            margin: "0 auto 40px",
            fontWeight: 400,
          }}
        >
          The AI-powered CMS that turns research into high-performance social
          content. Automate your pipeline. Build your authority. Own your audience.
        </p>

        {/* Hero CTA */}
        <form action={handleSignIn} style={{ display: "inline-block", marginBottom: "14px" }}>
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              color: "#e4e1e9",
              fontSize: "14px",
              fontWeight: 600,
              padding: "12px 28px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.2)", margin: 0 }}>
          No credit card required
        </p>

        {/* App screenshot mockup */}
        <div
          style={{
            marginTop: "64px",
            position: "relative",
            maxWidth: "820px",
            margin: "64px auto 0",
          }}
        >
          {/* Glow behind mockup */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-20px",
              background: "radial-gradient(ellipse at 50% 50%, rgba(107,47,217,0.15) 0%, transparent 70%)",
              filter: "blur(30px)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          {/* Mockup frame */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: "14px",
              overflow: "hidden",
              background: "#131318",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(107,47,217,0.1)",
            }}
          >
            {/* Browser chrome bar */}
            <div
              style={{
                height: "34px",
                background: "#1b1b20",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: "7px",
              }}
            >
              {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
                <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
              ))}
            </div>

            {/* Mock dashboard UI */}
            <div style={{ display: "flex", height: "380px" }}>
              {/* Sidebar */}
              <div
                style={{
                  width: "140px",
                  background: "#0e0e13",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                  padding: "16px 10px",
                  flexShrink: 0,
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "13px", color: "#FFB800", letterSpacing: "-0.5px" }}>CMS</div>
                  <div style={{ fontSize: "7px", color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginTop: "2px" }}>Sovereign Admin</div>
                </div>
                {[
                  { label: "Dashboard", active: false },
                  { label: "Research", active: false },
                  { label: "Insights", active: false },
                  { label: "Content", active: false },
                  { label: "Analytics", active: true },
                  { label: "Schedule", active: false },
                ].map(({ label, active }) => (
                  <div
                    key={label}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      color: active ? "#FFB800" : "rgba(255,255,255,0.3)",
                      background: active ? "rgba(255,184,0,0.07)" : "transparent",
                      marginBottom: "2px",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: "20px", overflow: "hidden" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "16px" }}>
                  Analytics Overview
                </div>

                {/* Bar chart */}
                <div
                  style={{
                    background: "#1b1b20",
                    borderRadius: "10px",
                    padding: "16px",
                    height: "220px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", display: "flex", justifyContent: "space-between" }}>
                    <span>Impressions</span>
                    <span style={{ color: "#FFB800" }}>↑ 24% this week</span>
                  </div>
                  {/* Bars */}
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "5px", paddingBottom: "4px" }}>
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 50, 72].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          borderRadius: "3px 3px 0 0",
                          height: `${h}%`,
                          background: i === 10
                            ? "linear-gradient(180deg, #FFB800, rgba(255,184,0,0.4))"
                            : "linear-gradient(180deg, rgba(107,47,217,0.8), rgba(107,47,217,0.3))",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Stat row */}
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  {[
                    { label: "Posts", value: "48" },
                    { label: "Scheduled", value: "12" },
                    { label: "Reach", value: "94k" },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        flex: 1,
                        background: "#1b1b20",
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                    >
                      <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "16px", color: "#e4e1e9", letterSpacing: "-0.5px" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURES — "Engineered for Excellence"
      ══════════════════════════════ */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          padding: "100px 48px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* Section label */}
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "3px",
            textTransform: "uppercase",
            color: "rgba(255,184,0,0.6)",
            marginBottom: "56px",
          }}
        >
          Engineered for Excellence
        </p>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Card 1 — AI-Engineered Research */}
          <div
            style={{
              background: "#131318",
              borderRadius: "16px",
              padding: "36px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Gold top accent */}
            <div style={{
              position: "absolute", top: 0, left: "20%", right: "20%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(255,184,0,0.5), transparent)",
            }} />
            {/* Icon */}
            <div
              style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "rgba(255,184,0,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <path d="M11 8v3M11 11h3" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "18px", color: "#e4e1e9", marginBottom: "12px", letterSpacing: "-0.3px" }}>
              AI-Engineered Research
            </h3>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: "20px" }}>
              Surface trending angles before anyone else. Our AI scans your niche in real time, identifying what your audience is searching for and what competitors are missing.
            </p>
            <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: "#FFB800", textDecoration: "none", letterSpacing: "0.02em" }}>
              Explore further →
            </a>
          </div>

          {/* Card 2 — Precision Analytics */}
          <div
            style={{
              background: "#131318",
              borderRadius: "16px",
              padding: "36px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Purple atmosphere glow */}
            <div aria-hidden="true" style={{
              position: "absolute", top: "-30px", right: "-30px",
              width: "180px", height: "180px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(107,47,217,0.25) 0%, transparent 70%)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(107,47,217,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1bcff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "18px", color: "#e4e1e9", marginBottom: "12px", letterSpacing: "-0.3px" }}>
                Precision Analytics
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: "20px" }}>
                Know exactly what&apos;s working and why. Track impressions, engagement, and reach across every post with a dashboard built for decision-making, not vanity metrics.
              </p>
              <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: "#d1bcff", textDecoration: "none", letterSpacing: "0.02em" }}>
                Explore further →
              </a>
            </div>
          </div>

          {/* Card 3 — Batch Generation (full width bottom) */}
          <div
            style={{
              gridColumn: "1 / -1",
              background: "#131318",
              borderRadius: "16px",
              padding: "36px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              gap: "48px",
              alignItems: "center",
            }}
          >
            {/* Gold orb */}
            <div aria-hidden="true" style={{
              position: "absolute", right: "80px", top: "50%",
              transform: "translateY(-50%)",
              width: "200px", height: "200px", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,184,0,0.2) 0%, rgba(107,47,217,0.1) 50%, transparent 70%)",
              filter: "blur(30px)",
              pointerEvents: "none",
            }} />
            <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(255,184,0,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="6" height="18" rx="1"/><rect x="18" y="3" width="4" height="18" rx="1"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "18px", color: "#e4e1e9", marginBottom: "12px", letterSpacing: "-0.3px" }}>
                Batch Generation
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: "20px", maxWidth: "500px" }}>
                Generate an entire week of content in minutes. Define your voice, set your niche, and let the system produce scroll-stopping posts — ready to review and schedule.
              </p>
              <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: "#FFB800", textDecoration: "none", letterSpacing: "0.02em" }}>
                Explore further →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA — "Ready to Seize Control?"
      ══════════════════════════════ */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "100px 48px 120px",
        }}
      >
        {/* Purple orb */}
        <div aria-hidden="true" style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(107,47,217,0.12) 0%, transparent 65%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 52px)",
              letterSpacing: "-1.5px",
              color: "#e4e1e9",
              marginBottom: "18px",
            }}
          >
            Ready to Seize Control?
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, maxWidth: "480px", margin: "0 auto 40px" }}>
            Join 1,200+ sovereign creators who are building authority through
            intelligent content automation.
          </p>
          <form action={handleSignIn} style={{ display: "inline-block" }}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(255,255,255,0.95)",
                color: "#111",
                fontSize: "14px",
                fontWeight: 600,
                padding: "13px 30px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
                transition: "box-shadow 0.15s",
              }}
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </form>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "28px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "13px", color: "#FFB800" }}>sovereign</span>
          <span style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>cms</span>
        </div>
        <div style={{ display: "flex", gap: "28px" }}>
          {["Features", "Research", "Insights"].map((label) => (
            <a key={label} href="#" style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.18)", margin: 0 }}>
          © 2026 Sovereign CMS
        </p>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
