"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TopPost } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, Check, ArrowRight, TrendingUp, Eye, Heart,
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
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [pipeline, setPipeline] = useState({ hasResearch: false, hasInsights: false, hasContent: false });

  useEffect(() => {
    setPipeline({
      hasResearch: !!store.getResearch(),
      hasInsights: !!store.getInsights(),
      hasContent:  !!store.getContent(),
    });
    const project = store.getProject();
    api.scheduler.list()
      .then((r) => setPosts((r as { posts: ScheduledPost[] }).posts))
      .catch(() => {});
    api.analytics.top(project?.id, 5)
      .then((r) => setTopPosts(r.top_posts))
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
    <div style={{ padding: "var(--space-9) var(--space-9)", display: "flex", flexDirection: "column", minHeight: "100%" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: "var(--space-7)" }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: "var(--space-2)", lineHeight: 1.2 }}>
          {greeting}
        </h1>
        <p style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {stepsCompleted === 0
            ? "Your pipeline is empty — pick a step below to start creating."
            : `${stepsCompleted} of 5 pipeline steps complete.`}
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
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
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "var(--space-6) var(--space-6) var(--space-5)",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: topColor }} />
            <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: labelColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "var(--space-5)" }}>
              {label}
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-stat)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)" }}>
                {value}
              </span>
              <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)" }}>{denom}</span>
            </div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>{sub}</p>
            <div style={{ height: "3px", borderRadius: "9999px", background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", borderRadius: "9999px", width: `${progress}%`, background: progColor, transition: "width 0.5s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Two columns ── */}
      <div style={{ display: "flex", gap: "var(--space-7)", flex: 1, minHeight: 0 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "var(--space-7)" }}>

          {/* Pipeline steps */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Content pipeline
              </p>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>{stepsCompleted} / 5 complete</span>
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
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-4)",
                        padding: "var(--space-4) var(--space-5)",
                        borderRadius: "var(--radius-md)", textDecoration: "none",
                        background: isActive ? "rgba(127,119,221,0.08)" : "var(--surface)",
                        border: `1px solid ${isActive ? "var(--accent-border)" : "var(--border)"}`,
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
                      {/* Step badge */}
                      <div style={{
                        width: "var(--space-7)", height: "var(--space-7)",
                        borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: "var(--text-sm)", fontWeight: 600,
                        background: isDone ? "var(--teal-dim)" : isActive ? "var(--accent-dim)" : "rgba(255,255,255,0.05)",
                        color:      isDone ? "var(--teal-text)" : isActive ? "var(--accent-light)" : "var(--text-subtle)",
                      }}>
                        {isDone ? <Check size={15} strokeWidth={2.5} /> : i + 1}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "var(--text-base)", fontWeight: 500, marginBottom: "var(--space-1)",
                          color: isActive ? "var(--accent-light)" : isDone ? "var(--text-muted)" : "rgba(255,255,255,0.88)" }}>
                          {label}
                        </p>
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>
                      </div>

                      {/* Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
                        {isDone ? (
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, padding: "4px 12px", borderRadius: "var(--radius-sm)", background: "var(--teal-dim)", color: "var(--teal-text)", border: "1px solid var(--teal-border)" }}>Done</span>
                        ) : isActive ? (
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, padding: "4px 12px", borderRadius: "var(--radius-sm)", background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)" }}>Start here →</span>
                        ) : (
                          <>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, padding: "4px 12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.05)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>Locked</span>
                            <ArrowRight size={14} style={{ color: "var(--text-subtle)" }} />
                          </>
                        )}
                      </div>
                    </Link>

                    {i < steps.length - 1 && (
                      <div style={{ width: "1px", height: "10px", background: "var(--border)", marginLeft: "calc(var(--space-7) / 2 + var(--space-5))" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent posts */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
              Recent posts
            </p>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              flex: 1, borderRadius: "var(--radius-lg)", background: "var(--surface)",
              border: "1px solid var(--border)", padding: "var(--space-8) var(--space-7)", textAlign: "center",
            }}>
              <div style={{ width: "var(--space-8)", height: "var(--space-8)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", marginBottom: "var(--space-4)" }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4">
                  <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6.5h6M5 9h4" />
                </svg>
              </div>
              <p style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "rgba(255,255,255,0.45)", marginBottom: "var(--space-2)" }}>
                No posts yet
              </p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)", lineHeight: 1.7, maxWidth: "260px", marginBottom: "var(--space-5)" }}>
                Once you move a post through the pipeline, it will appear here with status and publish date.
              </p>
              <Link
                href="/research"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                  fontSize: "var(--text-sm)", fontWeight: 500,
                  padding: "var(--space-2) var(--space-5)",
                  borderRadius: "var(--radius-sm)", textDecoration: "none",
                  background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)",
                  transition: "opacity 0.15s",
                }}
              >
                <span>+</span> Create your first post
              </Link>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", width: "clamp(280px, 28vw, 400px)", minWidth: "clamp(280px, 28vw, 400px)" }}>

          {/* Quick actions */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
            <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "var(--space-5)" }}>
              Quick actions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {quickActions.map(({ href, label, sub, iconBg, iconColor, icon: QIcon }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-4)",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)", textDecoration: "none",
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "var(--border-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ width: "var(--space-7)", height: "var(--space-7)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: iconBg }}>
                    <QIcon size={16} style={{ color: iconColor }} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: "var(--space-1)" }}>{label}</p>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>{sub}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--text-subtle)", flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Top performing posts */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <TrendingUp size={13} style={{ color: "var(--green)" }} />
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.09em", textTransform: "uppercase" }}>
                Top posts this month
              </p>
            </div>
            {topPosts.length === 0 ? (
              <p style={{ padding: "var(--space-6)", fontSize: "var(--text-sm)", color: "var(--text-subtle)", textAlign: "center" }}>
                No analytics yet — data pulls daily at 06:00 UTC.
              </p>
            ) : (
              <div>
                {topPosts.map((post, i) => (
                  <div
                    key={post.tweet_id}
                    style={{
                      padding: "var(--space-4) var(--space-5)",
                      borderBottom: i < topPosts.length - 1 ? "1px solid var(--border)" : "none",
                      display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    }}
                  >
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {post.text}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        <Eye size={11} style={{ color: "var(--text-subtle)" }} />
                        {post.impressions.toLocaleString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        <Heart size={11} style={{ color: "var(--text-subtle)" }} />
                        {post.likes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Getting started */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)", display: "flex", flexDirection: "column", flex: 1 }}>
            <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-subtle)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "var(--space-5)" }}>
              Getting started
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tips.map(({ dot, bold, rest }, i) => (
                <div
                  key={bold}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                    padding: "var(--space-3) 0",
                    borderBottom: i < tips.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, marginTop: "6px", flexShrink: 0 }} />
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.75 }}>
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
