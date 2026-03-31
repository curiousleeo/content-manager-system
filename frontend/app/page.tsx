"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  CalendarClock, ArrowRight,
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
    <div className="p-10 max-w-3xl">

        {/* Hero greeting */}
        <div className="mb-12">
          <p className="text-[11px] font-medium mb-3 uppercase tracking-[0.12em]" style={{ color: "var(--text-subtle)" }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-[38px] font-semibold tracking-tight mb-2" style={{ color: "var(--text)", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            {greeting}
          </h1>
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            {stepsCompleted === 0
              ? "Start your content pipeline below."
              : stepsCompleted < 5
              ? `${stepsCompleted} of 5 pipeline steps complete.`
              : "All steps complete — ready to post."}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          {[
            { label: "Pipeline",  value: `${stepsCompleted}`, suffix: "/5", sub: "steps complete",  dot: "var(--accent)" },
            { label: "Scheduled", value: String(scheduled),   suffix: "",   sub: "posts in queue",  dot: "var(--blue)"   },
            { label: "Published", value: String(published),   suffix: "",   sub: "posts sent",      dot: "var(--green)"  },
          ].map(({ label, value, suffix, sub, dot }) => (
            <div
              key={label}
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>
                  {label}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[36px] font-semibold leading-none tracking-tight" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>
                  {value}
                </span>
                {suffix && <span className="text-[18px] font-light" style={{ color: "var(--text-subtle)" }}>{suffix}</span>}
              </div>
              <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          {/* Header + progress */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>Content Pipeline</p>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{stepsCompleted} / 5 complete</span>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] rounded-full mb-5 overflow-hidden" style={{ background: "var(--surface-3)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(stepsCompleted / 5) * 100}%`, background: "var(--accent)" }}
            />
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
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: done ? "var(--accent-dim)" : "var(--surface-3)",
                      border: `1px solid ${done ? "var(--accent-border)" : "var(--border-2)"}`,
                    }}
                  >
                    <Icon size={14} style={{ color: done ? "var(--accent)" : "var(--text-muted)" }} strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-medium" style={{ color: "var(--text)" }}>{label}</p>
                      {done && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
                        >
                          done
                        </span>
                      )}
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <ArrowRight size={14} style={{ color: "var(--text-muted)" }} className="group-hover:translate-x-0.5 transition-transform duration-150" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
    </div>
  );
}
