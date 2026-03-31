"use client";

import { motion } from "framer-motion";

interface Props {
  signInAction: () => Promise<void>;
}

export default function LoginCard({ signInAction }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="relative w-full max-w-sm mx-4"
      style={{ zIndex: 10 }}
    >
      {/* Glow ring behind card */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15), transparent 70%)",
          filter: "blur(20px)",
          transform: "translateY(-10px) scale(1.05)",
        }}
      />

      {/* Card */}
      <div
        className="relative rounded-2xl p-8"
        style={{
          background: "rgba(8, 10, 18, 0.85)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 0 1px rgba(59,130,246,0.08), 0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex justify-center mb-6"
        >
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(59,130,246,0.1)",
              color: "rgba(59,130,246,0.9)",
              border: "1px solid rgba(59,130,246,0.2)",
              letterSpacing: "0.18em",
            }}
          >
            CMS
          </span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1
            className="text-2xl font-semibold mb-2"
            style={{ color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}
          >
            Content Manager
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Sign in to your workspace
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            continue with
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </motion.div>

        {/* Google button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <form action={signInAction}>
            <button
              type="submit"
              className="group w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "#111",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="text-center text-xs mt-5"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Access restricted to authorized accounts only.
        </motion.p>
      </div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
