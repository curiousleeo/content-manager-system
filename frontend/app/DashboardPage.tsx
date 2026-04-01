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
    <div style={{ padding: "52px 64px", display: "flex", flexDirection: "column", minHeight: "100%" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: "44px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: "10px", lineHeight: 1.2 }}>
          {greeting}
        </h1>
        <p style={{ fontSize: "16px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {stepsCompleted === 0
            ? "Your pipeline is empty — pick a step below to start creating."
            : `${stepsCompleted} of 5 pipeline steps complete.`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "48px" }}>
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
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "32px 32px 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: topColor }} />
            <p style={{ fontSize: "11px", fontWeight: 600, color: labelColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>
              {label}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "48px", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
                {value}
              </span>
              <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>{denom}</span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>{sub}</p>
            <div style={{ height: "3px", borderRadius: "9999px", background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", borderRadius: "9999px", width: `${progress}%`, background: progColor, transition: "width 0.5s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Two columns ── */}
      <div style={{ display: "flex", gap: "40px", flex: 1, minHeight: 0 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "36px" }}>

          {/* Pipeline steps */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Content pipeline
              </p>
              <span style={{ fontSize: "12px", color: "var(--text-subtle)" }}>{stepsCompleted} / 5 complete</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {steps.map(({ href, label, desc }, i) => {
                const state    = getState(i, doneStates);
                const isActive = state === "active";
                const isDone   = state === "done";

                return (
                  <div key={href}>
                    <Link
                      href={href}
                      className="group"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        padding: "20px 24px",
                        borderRadius: "12px",
                        background: isActive ? "rgba(127,119,221,0.08)" : "var(--surface)",
                        border: `1px solid ${isActive ? "var(--accent-border)" : "var(--border)"}`,
                        textDecoration: "none",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isActive ? "rgba(127,119,221,0.14)" : "var(--surface-2)";
                        if (!isActive) e.currentTarget.style.borderColor = "var(--border-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isActive ? "rgba(127,119,221,0.08)" : "var(--surface)";
                        e.currentTarget.style.borderColor = isActive ? "var(--accent-border)" : "var(--border)";
                      }}
                    >
                      {/* Step number / checkmark */}
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "15px",
                          fontWeight: 600,
                          background: isDone ? "var(--teal-dim)" : isActive ? "var(--accent-dim)" : "rgba(255,255,255,0.05)",
                          color:      isDone ? "var(--teal-text)" : isActive ? "var(--accent-light)" : "var(--text-subtle)",
                        }}
                      >
                        {isDone ? <Check size={17} strokeWidth={2.5} /> : i + 1}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: "15px",
                          fontWeight: 500,
                          marginBottom: "4px",
                          color: isActive ? "var(--accent-light)" : isDone ? "var(--text-muted)" : "rgba(255,255,255,0.88)",
                        }}>
                          {label}
                        </p>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>
                      </div>

                      {/* Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        {isDone ? (
                          <span style={{
                            fontSize: "11px", fontWeight: 500, padding: "4px 12px", borderRadius: "8px",
                            background: "var(--teal-dim)", color: "var(--teal-text)", border: "1px solid var(--teal-border)",
                          }}>Done</span>
                        ) : isActive ? (
                          <span style={{
                            fontSize: "11px", fontWeight: 500, padding: "4px 12px", borderRadius: "8px",
                            background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)",
                          }}>Start here →</span>
                        ) : (
                          <>
                            <span style={{
                              fontSize: "11px", fontWeight: 500, padding: "4px 12px", borderRadius: "8px",
                              background: "rgba(255,255,255,0.05)", color: "var(--text-subtle)", border: "1px solid var(--border)",
                            }}>Locked</span>
                            <ArrowRight size={14} style={{ color: "var(--text-subtle)" }} />
                          </>
                        )}
                      </div>
                    </Link>

                    {i < steps.length - 1 && (
                      <div style={{ width: "1px", height: "10px", background: "var(--border)", marginLeft: "46px" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent posts */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              Recent posts
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                borderRadius: "14px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "48px 40px",
                textAlign: "center",
              }}
            >
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.05)", marginBottom: "16px",
              }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4">
                  <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6.5h6M5 9h4" />
                </svg>
              </div>
              <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.45)", marginBottom: "8px" }}>
                No posts yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-subtle)", lineHeight: 1.7, maxWidth: "260px", marginBottom: "20px" }}>
                Once you move a post through the pipeline, it will appear here with status and publish date.
              </p>
              <Link
                href="/research"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "9px 18px",
                  borderRadius: "10px",
                  background: "var(--accent-dim)",
                  color: "var(--accent-light)",
                  border: "1px solid var(--accent-border)",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                }}
              >
                <span>+</span> Create your first post
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "400px", minWidth: "400px" }}>

          {/* Quick actions */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "28px",
          }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "20px" }}>
              Quick actions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {quickActions.map(({ href, label, sub, iconBg, iconColor, icon: QIcon }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 18px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "var(--border-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, background: iconBg,
                  }}>
                    <QIcon size={17} style={{ color: iconColor }} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: "3px" }}>{label}</p>
                    <p style={{ fontSize: "13px", color: "var(--text-subtle)" }}>{sub}</p>
                  </div>
                  <ArrowRight size={15} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Getting started */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "20px" }}>
              Getting started
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tips.map(({ dot, bold, rest }, i) => (
                <div
                  key={bold}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    padding: "16px 0",
                    borderBottom: i < tips.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, marginTop: "6px", flexShrink: 0 }} />
                  <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                    <strong style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{bold}</strong>{" "}
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
