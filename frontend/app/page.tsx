"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, ArrowRight, Clock, CheckCheck, AlertCircle, Send
} from "lucide-react";

const steps = [
  { href: "/research", label: "Research",  icon: Search,        step: "01", desc: "Find what people are talking about" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     step: "02", desc: "Analyze trends and find best angles" },
  { href: "/content",  label: "Generate",  icon: PenLine,       step: "03", desc: "Create content tuned for your voice" },
  { href: "/review",   label: "Review",    icon: CheckCircle,   step: "04", desc: "Catch AI-sounding language before posting" },
  { href: "/schedule", label: "Schedule",  icon: CalendarClock, step: "05", desc: "Post now or queue for later" },
];

interface ScheduledPost {
  status: string;
}

export default function Dashboard() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [pipelineState, setPipelineState] = useState({
    hasResearch: false, hasInsights: false, hasContent: false,
  });

  useEffect(() => {
    setPipelineState({
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
  const failed     = posts.filter((p) => p.status === "failed").length;

  const stepsCompleted = [
    pipelineState.hasResearch,
    pipelineState.hasInsights,
    pipelineState.hasContent,
  ].filter(Boolean).length;

  const stats = [
    {
      label: "Pipeline progress",
      value: `${stepsCompleted}/5`,
      sub: "steps completed",
      icon: CheckCheck,
      color: "var(--blue)",
      dimColor: "var(--blue-dim)",
    },
    {
      label: "Scheduled",
      value: scheduled,
      sub: "posts in queue",
      icon: Clock,
      color: "var(--yellow)",
      dimColor: "var(--yellow-dim)",
    },
    {
      label: "Published",
      value: published,
      sub: "posts sent",
      icon: Send,
      color: "var(--green)",
      dimColor: "var(--green-dim)",
    },
    {
      label: "Failed",
      value: failed,
      sub: "need attention",
      icon: AlertCircle,
      color: "var(--red)",
      dimColor: "var(--red-dim)",
    },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text)" }}>
          Content Manager
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Research → Insights → Generate → Review → Schedule
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, color, dimColor }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: dimColor }}
              >
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: "var(--text)" }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline steps */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Pipeline
          </p>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            5 steps
          </span>
        </div>

        <div style={{ background: "var(--surface)" }}>
          {steps.map(({ href, label, icon: Icon, step, desc }, i) => {
            const done =
              (step === "01" && pipelineState.hasResearch) ||
              (step === "02" && pipelineState.hasInsights) ||
              (step === "03" && pipelineState.hasContent);

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-5 py-4 transition-colors group"
                style={{
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  background: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Step number */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: done ? "var(--green-dim)" : "var(--surface-3)",
                    border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                  }}
                >
                  <Icon size={13} style={{ color: done ? "var(--green)" : "var(--text-muted)" }} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {label}
                    {done && (
                      <span
                        className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                        style={{ background: "var(--green-dim)", color: "var(--green)" }}
                      >
                        done
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>

                {/* Step number + arrow */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {step}
                  </span>
                  <ArrowRight
                    size={14}
                    style={{ color: "var(--text-muted)" }}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
