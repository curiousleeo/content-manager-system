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
  { href: "/research", label: "Research",  icon: Search,        desc: "Find topics and conversations your audience is already engaged in" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     desc: "Analyze trends and surface the best angle to take" },
  { href: "/content",  label: "Generate",  icon: PenLine,       desc: "Write content tuned for your voice and platform" },
  { href: "/review",   label: "Review",    icon: CheckCircle,   desc: "Catch weak hooks and thin angles before posting" },
  { href: "/schedule", label: "Schedule",  icon: CalendarClock, desc: "Post immediately or queue for your best time slots" },
];

const quickActions = [
  { href: "/research", label: "Research a topic",   sub: "Find trending angles",     iconBg: "var(--accent-dim)",  iconColor: "var(--accent-light)", icon: Search        },
  { href: "/content",  label: "Generate from idea", sub: "Skip straight to writing", iconBg: "var(--teal-dim)",    iconColor: "var(--teal-text)",    icon: PenLine       },
  { href: "/schedule", label: "Schedule a slot",    sub: "Block time to post",       iconBg: "var(--amber-dim)",   iconColor: "var(--amber-text)",   icon: CalendarClock },
];

const tips = [
  { dot: "var(--accent)", bold: "Research first.",              rest: "Strong posts start with what your audience is already curious about — not what you want to say." },
  { dot: "var(--teal)",   bold: "Find your angle in Insights.", rest: "Don't just report a trend — take a point of view on it." },
  { dot: "var(--amber)",  bold: "Review before scheduling.",    rest: "One weak hook kills reach. Catch it at step 4, not after publishing." },
  { dot: "var(--pink)",   bold: "Queue 3–5 posts ahead.",       rest: "Consistency compounds. Batch your pipeline once a week." },
];

interface ScheduledPost { status: string; }
type StepState = "done" | "active" | "locked";

function getState(i: number, doneStates: boolean[]): StepState {
  const first = doneStates.findIndex((d) => !d);
  if (first === -1) return "done";
  if (i < first) return "done";
  if (i === first) return "active";
  return "locked";
}

export default function DashboardPage({ firstName }: { firstName: string }) {
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

  const scheduled      = posts.filter((p) => p.status === "scheduled").length;
  const published      = posts.filter((p) => p.status === "posted").length;
  const doneStates     = [pipeline.hasResearch, pipeline.hasInsights, pipeline.hasContent, false, false];
  const stepsCompleted = doneStates.filter(Boolean).length;

  const hour     = new Date().getHours();
  const tod      = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greeting = firstName ? `${tod}, ${firstName}.` : `${tod}.`;

  return (
    <div className="flex flex-col min-h-full" style={{ padding: "40px 44px", maxWidth: "1200px" }}>

      {/* ── Greeting ── */}
      <div className="mb-10">
        <h1
          className="font-semibold mb-2.5"
          style={{ fontSize: "32px", letterSpacing: "-0.028em", color: "var(--text)" }}
        >
          {greeting}
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {stepsCompleted === 0
            ? "Your pipeline is empty — pick a step below to start creating your first post."
            : `${stepsCompleted} of 5 pipeline steps complete.`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Pipeline",  labelColor: "var(--accent-light)", topColor: "var(--accent)", progColor: "var(--accent)",
            value: stepsCompleted, denom: "/ 5 steps", sub: stepsCompleted === 0 ? "No active post in progress" : `${stepsCompleted} steps done`, progress: (stepsCompleted / 5) * 100 },
          { label: "Scheduled", labelColor: "var(--teal-text)",    topColor: "var(--teal)",   progColor: "var(--teal)",
            value: scheduled, denom: "posts", sub: scheduled === 0 ? "Nothing queued yet" : `${scheduled} in queue`, progress: Math.min(scheduled * 20, 100) },
          { label: "Published", labelColor: "var(--amber-text)",   topColor: "var(--amber)",  progColor: "var(--amber)",
            value: published, denom: "all time", sub: published === 0 ? "Start publishing to see stats" : `${published} published`, progress: Math.min(published * 10, 100) },
        ].map(({ label, labelColor, topColor, progColor, value, denom, sub, progress }) => (
          <div
            key={label}
            className="rounded-xl relative overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px 24px 20px" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: topColor }} />
            <p className="font-semibold uppercase mb-4" style={{ fontSize: "11px", color: labelColor, letterSpacing: "0.1em" }}>
              {label}
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span style={{ fontSize: "40px", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
                {value}
              </span>
              <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>{denom}</span>
            </div>
            <p className="mb-5" style={{ fontSize: "13px", color: "var(--text-muted)" }}>{sub}</p>
            <div className="h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progColor }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column — flex-1 so it fills remaining height ── */}
      <div className="flex gap-6 flex-1 min-h-0">

        {/* Left */}
        <div className="flex flex-col flex-1 min-w-0 gap-6">

          {/* Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold uppercase" style={{ fontSize: "11.5px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                Content pipeline
              </p>
              <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>{stepsCompleted} / 5 complete</span>
            </div>

            <div>
              {steps.map(({ href, label, icon: Icon, desc }, i) => {
                const state    = getState(i, doneStates);
                const isActive = state === "active";
                const isDone   = state === "done";

                return (
                  <div key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-5 rounded-xl transition-all duration-150 group"
                      style={{
                        padding: "16px 20px",
                        background: isActive ? "rgba(127,119,221,0.07)" : "var(--surface)",
                        border: `1px solid ${isActive ? "var(--accent-border)" : "var(--border)"}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isActive ? "rgba(127,119,221,0.12)" : "var(--surface-2)";
                        if (!isActive) e.currentTarget.style.borderColor = "var(--border-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isActive ? "rgba(127,119,221,0.07)" : "var(--surface)";
                        e.currentTarget.style.borderColor = isActive ? "var(--accent-border)" : "var(--border)";
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-semibold shrink-0"
                        style={{
                          background: isDone ? "var(--teal-dim)" : isActive ? "var(--accent-dim)" : "rgba(255,255,255,0.05)",
                          color:      isDone ? "var(--teal-text)" : isActive ? "var(--accent-light)" : "var(--text-subtle)",
                        }}
                      >
                        {isDone ? <Check size={15} strokeWidth={2.5} /> : i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium mb-1"
                          style={{
                            fontSize: "15px",
                            color: isActive ? "var(--accent-light)" : isDone ? "var(--text-muted)" : "rgba(255,255,255,0.88)",
                          }}
                        >
                          {label}
                        </p>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDone ? (
                          <span className="text-[11px] font-medium px-3 py-1 rounded-lg"
                            style={{ background: "var(--teal-dim)", color: "var(--teal-text)", border: "1px solid var(--teal-border)" }}>
                            Done
                          </span>
                        ) : isActive ? (
                          <span className="text-[11px] font-medium px-3 py-1 rounded-lg"
                            style={{ background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)" }}>
                            Start here →
                          </span>
                        ) : (
                          <>
                            <span className="text-[11px] font-medium px-3 py-1 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>
                              Locked
                            </span>
                            <ArrowRight size={14} style={{ color: "var(--text-subtle)" }}
                              className="group-hover:translate-x-0.5 transition-transform duration-150" />
                          </>
                        )}
                      </div>
                    </Link>

                    {i < steps.length - 1 && (
                      <div className="w-px h-2.5" style={{ background: "var(--border)", marginLeft: "38px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent posts — flex-1 so it stretches to fill remaining left-column height */}
          <div className="flex flex-col flex-1">
            <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.08em" }}>
              Recent posts
            </p>
            <div
              className="flex flex-col items-center justify-center flex-1 rounded-xl text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "40px 32px" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4">
                  <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6.5h6M5 9h4" />
                </svg>
              </div>
              <p className="font-medium mb-2" style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)" }}>
                No posts yet
              </p>
              <p className="mb-5" style={{ fontSize: "13px", color: "var(--text-subtle)", lineHeight: 1.7, maxWidth: "240px" }}>
                Once you move a post through the pipeline, it will appear here with status and publish date.
              </p>
              <Link
                href="/research"
                className="inline-flex items-center gap-2 font-medium rounded-lg transition-all hover:opacity-90"
                style={{ fontSize: "12.5px", padding: "8px 16px", background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)" }}
              >
                <span>+</span> Create your first post
              </Link>
            </div>
          </div>
        </div>

        {/* Right — fixed width, fills height */}
        <div className="flex flex-col gap-5" style={{ width: "300px", minWidth: "300px" }}>

          {/* Quick actions */}
          <div className="rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px" }}>
            <p className="font-semibold uppercase mb-5" style={{ fontSize: "11.5px", color: "var(--text-subtle)", letterSpacing: "0.09em" }}>
              Quick actions
            </p>
            <div className="flex flex-col gap-2.5">
              {quickActions.map(({ href, label, sub, iconBg, iconColor, icon: QIcon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3.5 rounded-lg transition-all group"
                  style={{ padding: "11px 13px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "var(--border-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                    <QIcon size={15} style={{ color: iconColor }} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)" }}>{label}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-subtle)" }}>{sub}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--text-subtle)" }}
                    className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </Link>
              ))}
            </div>
          </div>

          {/* Getting started — flex-1 to fill remaining right-column height */}
          <div className="rounded-xl flex flex-col flex-1" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px" }}>
            <p className="font-semibold uppercase mb-5" style={{ fontSize: "11.5px", color: "var(--text-subtle)", letterSpacing: "0.09em" }}>
              Getting started
            </p>
            <div className="flex flex-col gap-0">
              {tips.map(({ dot, bold, rest }, i) => (
                <div
                  key={bold}
                  className="flex items-start gap-3 py-3.5"
                  style={{ borderBottom: i < tips.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="w-[7px] h-[7px] rounded-full mt-[5px] shrink-0" style={{ background: dot }} />
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                    <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{bold}</strong>{" "}
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
