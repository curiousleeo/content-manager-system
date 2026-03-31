"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, ArrowRight, TrendingUp
} from "lucide-react";

const steps = [
  { href: "/research", label: "Research",  icon: Search,        step: "01", desc: "Find what people are talking about" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     step: "02", desc: "Analyze trends and angles" },
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
    <div className="p-8 max-w-4xl">
      {/* Hero greeting */}
      <div className="mb-10">
        <p className="text-[12px] font-medium mb-2" style={{ color: "var(--text-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight mb-1" style={{ color: "var(--text)", lineHeight: 1.2 }}>
          {greeting}
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
          {stepsCompleted === 0
            ? "Start your content pipeline below."
            : stepsCompleted < 5
            ? `You're ${stepsCompleted} steps through the pipeline.`
            : "All steps complete — time to post."}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: "Pipeline", value: `${stepsCompleted}`, suffix: "/ 5", sub: "steps done", color: "var(--accent)" },
          { label: "Scheduled", value: String(scheduled), suffix: "", sub: "in queue", color: "var(--yellow)" },
          { label: "Published", value: String(published), suffix: "", sub: "posts sent", color: "var(--green)" },
        ].map(({ label, value, suffix, sub, color }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-[11px] font-medium mb-3" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {label}
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[32px] font-semibold leading-none tracking-tight" style={{ color }}>
                {value}
              </span>
              {suffix && <span className="text-[16px]" style={{ color: "var(--text-muted)" }}>{suffix}</span>}
            </div>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>Pipeline</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>5 steps</span>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {steps.map(({ href, label, icon: Icon, step, desc }, i) => {
            const done =
              (step === "01" && pipeline.hasResearch) ||
              (step === "02" && pipeline.hasInsights) ||
              (step === "03" && pipeline.hasContent);

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 px-5 py-4 transition-colors group"
                style={{
                  background: "var(--surface)",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                {/* Step dot */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: done ? "var(--green-dim)" : "var(--surface-3)",
                    border: `1px solid ${done ? "var(--green-border)" : "var(--border-2)"}`,
                  }}
                >
                  <Icon size={13} style={{ color: done ? "var(--green)" : "var(--text-muted)" }} strokeWidth={done ? 2 : 1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{label}</p>
                    {done && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-border)" }}
                      >
                        done
                      </span>
                    )}
                  </div>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--text-subtle)" }}>{step}</span>
                  <ArrowRight size={13} style={{ color: "var(--text-muted)" }} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
