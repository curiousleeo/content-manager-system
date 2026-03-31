"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, Check, ArrowRight,
} from "lucide-react";

const steps = [
  {
    href: "/research", label: "Research",  icon: Search,
    desc: "Find topics and conversations your audience is already engaged in",
  },
  {
    href: "/insights", label: "Insights",  icon: Lightbulb,
    desc: "Analyze trends and surface the best angle to take",
  },
  {
    href: "/content",  label: "Generate",  icon: PenLine,
    desc: "Write content tuned for your voice and platform",
  },
  {
    href: "/review",   label: "Review",    icon: CheckCircle,
    desc: "Catch weak hooks and thin angles before posting",
  },
  {
    href: "/schedule", label: "Schedule",  icon: CalendarClock,
    desc: "Post immediately or queue for your best time slots",
  },
];

const quickActions = [
  {
    href: "/research", label: "Research a topic",   sub: "Find trending angles",
    iconBg: "var(--accent-dim)",  iconColor: "var(--accent-light)", icon: Search,
  },
  {
    href: "/content",  label: "Generate from idea", sub: "Skip straight to writing",
    iconBg: "var(--teal-dim)",    iconColor: "var(--teal-text)",    icon: PenLine,
  },
  {
    href: "/schedule", label: "Schedule a slot",    sub: "Block time to post",
    iconBg: "var(--amber-dim)",   iconColor: "var(--amber-text)",   icon: CalendarClock,
  },
];

const tips = [
  {
    dot: "var(--accent)",
    bold: "Research first.",
    rest: "Strong posts start with what your audience is already curious about — not what you want to say.",
  },
  {
    dot: "var(--teal)",
    bold: "Find your angle in Insights.",
    rest: "Don't just report a trend — take a point of view on it.",
  },
  {
    dot: "var(--amber)",
    bold: "Review before scheduling.",
    rest: "One weak hook kills reach. Catch it at step 4, not after publishing.",
  },
  {
    dot: "var(--pink)",
    bold: "Queue 3–5 posts ahead.",
    rest: "Consistency compounds. Batch your pipeline once a week.",
  },
];

interface ScheduledPost { status: string; }
type StepState = "done" | "active" | "locked";

function getState(index: number, doneStates: boolean[]): StepState {
  const firstUndone = doneStates.findIndex((d) => !d);
  if (firstUndone === -1) return "done";
  if (index < firstUndone) return "done";
  if (index === firstUndone) return "active";
  return "locked";
}

export default function DashboardPage({ firstName }: { firstName: string }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pipeline, setPipeline] = useState({
    hasResearch: false, hasInsights: false, hasContent: false,
  });

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

  const scheduled     = posts.filter((p) => p.status === "scheduled").length;
  const published     = posts.filter((p) => p.status === "posted").length;
  const doneStates    = [pipeline.hasResearch, pipeline.hasInsights, pipeline.hasContent, false, false];
  const stepsCompleted = doneStates.filter(Boolean).length;

  const hour = new Date().getHours();
  const tod  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greeting = firstName ? `${tod}, ${firstName}.` : `${tod}.`;

  const subtext = stepsCompleted === 0
    ? "Your pipeline is empty — pick a step below to start creating your first post."
    : `${stepsCompleted} of 5 pipeline steps complete.`;

  return (
    <div className="p-9" style={{ maxWidth: "1100px" }}>

      {/* ── Greeting ── */}
      <div className="mb-8">
        <h1
          className="font-semibold mb-1.5"
          style={{ fontSize: "28px", letterSpacing: "-0.025em", color: "var(--text)" }}
        >
          {greeting}
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
          {subtext}
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3.5 mb-8">
        {[
          {
            label: "Pipeline",
            labelColor: "var(--accent-light)", topColor: "var(--accent)", progColor: "var(--accent)",
            value: stepsCompleted, denom: "/ 5 steps",
            sub: stepsCompleted === 0 ? "No active post in progress" : `${stepsCompleted} steps done`,
            progress: (stepsCompleted / 5) * 100,
          },
          {
            label: "Scheduled",
            labelColor: "var(--teal-text)", topColor: "var(--teal)", progColor: "var(--teal)",
            value: scheduled, denom: "posts",
            sub: scheduled === 0 ? "Nothing queued yet" : `${scheduled} post${scheduled !== 1 ? "s" : ""} in queue`,
            progress: Math.min(scheduled * 20, 100),
          },
          {
            label: "Published",
            labelColor: "var(--amber-text)", topColor: "var(--amber)", progColor: "var(--amber)",
            value: published, denom: "all time",
            sub: published === 0 ? "Start publishing to see stats" : `${published} published`,
            progress: Math.min(published * 10, 100),
          },
        ].map(({ label, labelColor, topColor, progColor, value, denom, sub, progress }) => (
          <div
            key={label}
            className="rounded-xl px-6 py-5 relative overflow-hidden transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: topColor }} />

            <p
              className="text-[10px] font-semibold uppercase mb-3"
              style={{ color: labelColor, letterSpacing: "0.09em" }}
            >
              {label}
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span
                style={{
                  fontSize: "36px", fontWeight: 600,
                  letterSpacing: "-0.04em", lineHeight: 1,
                  color: "var(--text)",
                }}
              >
                {value}
              </span>
              <span className="text-[14px]" style={{ color: "var(--text-muted)" }}>{denom}</span>
            </div>
            <p className="text-[12px] mb-3.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
            <div className="h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: progColor }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 300px" }}>

        {/* Left: pipeline + recent posts */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}
            >
              Content pipeline
            </p>
            <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>
              {stepsCompleted} / 5 complete
            </span>
          </div>

          {/* Steps with connector lines */}
          <div>
            {steps.map(({ href, label, icon: Icon, desc }, i) => {
              const state    = getState(i, doneStates);
              const isActive = state === "active";
              const isDone   = state === "done";

              return (
                <div key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-4 px-[18px] py-4 rounded-xl transition-all duration-150 group"
                    style={{
                      background: isActive ? "rgba(127,119,221,0.06)" : "var(--surface)",
                      border: `1px solid ${isActive ? "var(--accent-border)" : "var(--border)"}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isActive
                        ? "rgba(127,119,221,0.1)"
                        : "var(--surface-2)";
                      if (!isActive) e.currentTarget.style.borderColor = "var(--border-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive
                        ? "rgba(127,119,221,0.06)"
                        : "var(--surface)";
                      e.currentTarget.style.borderColor = isActive
                        ? "var(--accent-border)"
                        : "var(--border)";
                    }}
                  >
                    {/* Step circle */}
                    <div
                      className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[12px] font-semibold shrink-0"
                      style={{
                        background: isDone
                          ? "var(--teal-dim)"
                          : isActive
                          ? "var(--accent-dim)"
                          : "rgba(255,255,255,0.05)",
                        color: isDone
                          ? "var(--teal-text)"
                          : isActive
                          ? "var(--accent-light)"
                          : "var(--text-subtle)",
                      }}
                    >
                      {isDone
                        ? <Check size={14} strokeWidth={2.5} />
                        : i + 1
                      }
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-medium mb-0.5"
                        style={{
                          color: isActive
                            ? "var(--accent-light)"
                            : isDone
                            ? "var(--text-muted)"
                            : "rgba(255,255,255,0.82)",
                        }}
                      >
                        {label}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                    </div>

                    {/* Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isDone ? (
                        <span
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                          style={{
                            background: "var(--teal-dim)",
                            color: "var(--teal-text)",
                            border: "1px solid var(--teal-border)",
                          }}
                        >
                          Done
                        </span>
                      ) : isActive ? (
                        <span
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                          style={{
                            background: "var(--accent-dim)",
                            color: "var(--accent-light)",
                            border: "1px solid var(--accent-border)",
                          }}
                        >
                          Start here →
                        </span>
                      ) : (
                        <>
                          <span
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: "var(--text-subtle)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            Locked
                          </span>
                          <ArrowRight
                            size={14}
                            style={{ color: "var(--text-subtle)" }}
                            className="group-hover:translate-x-0.5 transition-transform duration-150"
                          />
                        </>
                      )}
                    </div>
                  </Link>

                  {/* Connector line between steps */}
                  {i < steps.length - 1 && (
                    <div
                      className="w-px h-2"
                      style={{ background: "var(--border)", marginLeft: "36px" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent posts */}
          <div className="mt-5">
            <p
              className="text-[11px] font-semibold uppercase mb-3.5"
              style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}
            >
              Recent posts
            </p>
            <div
              className="rounded-xl px-6 py-8 flex flex-col items-center text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4">
                  <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6.5h6M5 9h4" />
                </svg>
              </div>
              <p
                className="text-[13px] font-medium mb-1.5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                No posts yet
              </p>
              <p
                className="text-[12px] mb-4"
                style={{ color: "var(--text-subtle)", lineHeight: 1.7, maxWidth: "220px" }}
              >
                Once you move a post through the pipeline, it will appear here with status and publish date.
              </p>
              <Link
                href="/research"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-lg transition-all hover:opacity-90"
                style={{
                  background: "var(--accent-dim)",
                  color: "var(--accent-light)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                <span>+</span> Create your first post
              </Link>
            </div>
          </div>
        </div>

        {/* Right: quick actions + tips */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-[11px] font-semibold uppercase mb-4"
              style={{ color: "var(--text-subtle)", letterSpacing: "0.08em" }}
            >
              Quick actions
            </p>
            <div className="flex flex-col gap-2">
              {quickActions.map(({ href, label, sub, iconBg, iconColor, icon: QIcon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all group"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.borderColor = "var(--border-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: iconBg }}
                  >
                    <QIcon size={14} style={{ color: iconColor }} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {label}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{sub}</p>
                  </div>
                  <ArrowRight
                    size={13}
                    style={{ color: "var(--text-subtle)" }}
                    className="group-hover:translate-x-0.5 transition-transform duration-150"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Getting started tips */}
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-[11px] font-semibold uppercase mb-4"
              style={{ color: "var(--text-subtle)", letterSpacing: "0.08em" }}
            >
              Getting started
            </p>
            <div>
              {tips.map(({ dot, bold, rest }, i) => (
                <div
                  key={bold}
                  className="flex items-start gap-2.5 py-2.5"
                  style={{
                    borderBottom: i < tips.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    className="w-[6px] h-[6px] rounded-full mt-[6px] shrink-0"
                    style={{ background: dot }}
                  />
                  <p className="text-[12px]" style={{ color: "var(--text-muted)", lineHeight: 1.65 }}>
                    <strong style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>
                      {bold}
                    </strong>{" "}
                    {rest}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
