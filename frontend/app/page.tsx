"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, ArrowRight, Check,
} from "lucide-react";

const steps = [
  { href: "/research", label: "Research",  icon: Search,        step: "01", desc: "Find what people are talking about" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     step: "02", desc: "Surface trends and content angles" },
  { href: "/content",  label: "Generate",  icon: PenLine,       step: "03", desc: "Write content tuned for your voice" },
  { href: "/review",   label: "Review",    icon: CheckCircle,   step: "04", desc: "Catch weak angles before posting" },
  { href: "/schedule", label: "Schedule",  icon: CalendarClock, step: "05", desc: "Post now or queue for later" },
];

interface ScheduledPost { status: string; }

export default function Dashboard() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pipeline, setPipeline] = useState({ hasResearch: false, hasInsights: false, hasContent: false });

  useEffect(() => {
    setPipeline({
      hasResearch: !!store.getResearch(),
      hasInsights: !!store.getInsights(),
      hasContent:  !!store.getContent(),
    });
    api.scheduler.list()
      .then((r) => setPosts((r as { posts: ScheduledPost[] }).posts))
      .catch(() => {});
  }, []);

  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const published  = posts.filter((p) => p.status === "posted").length;
  const stepsCompleted = [pipeline.hasResearch, pipeline.hasInsights, pipeline.hasContent].filter(Boolean).length;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-10 max-w-2xl">

      {/* ── Hero ── */}
      <div className="relative mb-14">
        {/* Ambient glow behind heading */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-40px", left: "-20px", width: "320px", height: "160px",
            background: "radial-gradient(ellipse at 20% 50%, rgba(167,139,250,0.07), transparent 70%)",
          }}
        />

        <p
          className="text-[11px] font-semibold uppercase mb-4"
          style={{ color: "var(--text-subtle)", letterSpacing: "0.14em" }}
        >
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>

        <h1
          style={{
            fontSize: "52px",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            color: "var(--text)",
          }}
        >
          {greeting}
        </h1>

        <p className="mt-3 text-[15px]" style={{ color: "var(--text-dim)", lineHeight: 1.6 }}>
          {stepsCompleted === 0
            ? "Your content pipeline is ready. Start with research."
            : stepsCompleted < 5
            ? `${stepsCompleted} of 5 steps complete. Keep going.`
            : "Pipeline complete — ready to schedule and post."}
        </p>

        {stepsCompleted === 0 && (
          <Link
            href="/research"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg text-[13.5px] font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Start pipeline
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* ── Stats ── */}
      <div
        className="grid grid-cols-3 rounded-xl overflow-hidden mb-12"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {[
          { label: "Pipeline",  value: `${stepsCompleted}`, suffix: "/5", sub: "steps done",    dot: "var(--accent)" },
          { label: "Scheduled", value: String(scheduled),   suffix: "",   sub: "in queue",      dot: "var(--blue)"   },
          { label: "Published", value: String(published),   suffix: "",   sub: "posts sent",    dot: "var(--green)"  },
        ].map(({ label, value, suffix, sub, dot }, i) => (
          <div
            key={label}
            className="px-6 py-5"
            style={{ borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
              <p
                className="text-[11px] font-semibold uppercase"
                style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}
              >
                {label}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                style={{
                  fontSize: "40px",
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  color: "var(--text)",
                }}
              >
                {value}
              </span>
              {suffix && (
                <span className="text-[18px] font-light" style={{ color: "var(--text-subtle)" }}>
                  {suffix}
                </span>
              )}
            </div>
            <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Pipeline ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
          >
            Content Pipeline
          </p>
          <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
            {stepsCompleted} / 5
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-[2px] rounded-full mb-6 overflow-hidden"
          style={{ background: "var(--surface-3)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(stepsCompleted / 5) * 100}%`,
              background: "linear-gradient(90deg, var(--accent), rgba(167,139,250,0.6))",
            }}
          />
        </div>

        {/* Step cards */}
        <div className="flex flex-col gap-2">
          {steps.map(({ href, label, icon: Icon, step, desc }) => {
            const done =
              (step === "01" && pipeline.hasResearch) ||
              (step === "02" && pipeline.hasInsights) ||
              (step === "03" && pipeline.hasContent);

            return (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-5 px-5 py-4 rounded-xl transition-all duration-150"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.35)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Step number */}
                <span
                  className="text-[11px] font-mono w-5 shrink-0 text-right"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {step}
                </span>

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150"
                  style={{
                    background: done ? "var(--accent-dim)" : "var(--surface-3)",
                    border: `1px solid ${done ? "var(--accent-border)" : "var(--border-2)"}`,
                  }}
                >
                  {done
                    ? <Check size={14} style={{ color: "var(--accent)" }} strokeWidth={2.5} />
                    : <Icon size={14} style={{ color: "var(--text-muted)" }} strokeWidth={1.75} />
                  }
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-medium leading-snug"
                    style={{ color: done ? "var(--text-dim)" : "var(--text)" }}
                  >
                    {label}
                  </p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>

                {/* Status */}
                {done ? (
                  <span
                    className="text-[11px] font-medium px-2 py-1 rounded-md shrink-0"
                    style={{
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent-border)",
                    }}
                  >
                    done
                  </span>
                ) : (
                  <ArrowRight
                    size={15}
                    style={{ color: "var(--text-subtle)" }}
                    className="shrink-0 group-hover:translate-x-0.5 group-hover:text-[var(--text-muted)] transition-all duration-150"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
