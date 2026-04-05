"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TopPost } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  Calendar, Check, TrendingUp, Eye, Heart, Zap,
  LayoutGrid, BarChart2, Target,
} from "lucide-react";
import StatusBar from "@/components/StatusBar";

const STEPS = [
  { href: "/research", label: "Research",  icon: Search,        desc: "Find topics your audience cares about" },
  { href: "/insights", label: "Insights",  icon: Lightbulb,     desc: "Analyze trends and find the best angle" },
  { href: "/content",  label: "Generate",  icon: PenLine,       desc: "Write content tuned for your voice" },
  { href: "/review",   label: "Review",    icon: CheckCircle,   desc: "Catch weak hooks before posting" },
  { href: "/schedule", label: "Schedule",  icon: Calendar,      desc: "Queue for your best time slots" },
];

const QUICK_ACTIONS = [
  { href: "/research",  label: "Research a topic",   desc: "Find trending angles",    icon: Search,    bg: "rgba(255,184,0,0.08)",    color: "var(--gold)"     },
  { href: "/content",   label: "Generate from idea", desc: "Skip straight to writing", icon: PenLine,   bg: "rgba(34,197,94,0.08)",    color: "var(--green)"    },
  { href: "/schedule",  label: "Schedule a slot",    desc: "Block time to post",       icon: Calendar,  bg: "rgba(245,158,11,0.08)",   color: "var(--amber)"    },
  { href: "/analytics", label: "View analytics",     desc: "Check performance",        icon: BarChart2, bg: "rgba(107,47,217,0.08)",   color: "var(--purple-l)" },
];

type TriggerState = "idle" | "loading" | "done" | "error";
type StepState    = "done" | "active" | "locked";

function getState(i: number, done: boolean[]): StepState {
  const first = done.findIndex((d) => !d);
  if (first === -1) return "done";
  if (i < first)  return "done";
  if (i === first) return "active";
  return "locked";
}

interface ScheduledPost { status: string; }

export default function DashboardPage({ firstName }: { firstName: string }) {
  const [posts, setPosts]       = useState<ScheduledPost[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [pipeline, setPipeline] = useState({ hasResearch: false, hasInsights: false, hasContent: false });
  const [triggerState, setTriggerState] = useState<TriggerState>("idle");
  const [triggerError, setTriggerError] = useState("");

  useEffect(() => {
    setPipeline({ hasResearch: !!store.getResearch(), hasInsights: !!store.getInsights(), hasContent: !!store.getContent() });
    const project = store.getProject();
    api.scheduler.list().then((r) => setPosts((r as { posts: ScheduledPost[] }).posts)).catch(() => {});
    api.analytics.top(project?.id, 5).then((r) => setTopPosts(r.top_posts)).catch(() => {});
  }, []);

  async function triggerAutoPoster() {
    const project = store.getProject();
    if (!project?.id) { setTriggerError("No active project selected."); setTriggerState("error"); return; }
    setTriggerState("loading"); setTriggerError("");
    try {
      await api.scheduler.trigger(project.id);
      setTriggerState("done"); setTimeout(() => setTriggerState("idle"), 3000);
    } catch (e) {
      setTriggerError((e as Error).message); setTriggerState("error");
      setTimeout(() => setTriggerState("idle"), 4000);
    }
  }

  const scheduled    = posts.filter((p) => p.status === "scheduled").length;
  const published    = posts.filter((p) => p.status === "posted").length;
  const doneStates   = [pipeline.hasResearch, pipeline.hasInsights, pipeline.hasContent, false, false];
  const stepsCompleted = doneStates.filter(Boolean).length;
  const activeStep   = STEPS[stepsCompleted] ?? STEPS[0];

  const hour     = new Date().getHours();
  const tod      = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greeting = firstName ? `${tod}, ${firstName}.` : `${tod}.`;

  return (
    <>
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "40px", letterSpacing: "-1.5px", color: "var(--t1)", lineHeight: 1.1 }}>
          {greeting}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t2)", marginTop: "8px" }}>
          {stepsCompleted === 0
            ? "Pipeline empty — start with Research."
            : `${stepsCompleted} of 5 pipeline steps complete. Next: ${activeStep.label}.`}
        </p>
      </div>

      {/* ── Pipeline stepper ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "5px", marginBottom: "28px" }}>
        {STEPS.map(({ label }, i) => {
          const state = getState(i, doneStates);
          return (
            <div key={label}>
              <div style={{
                height: "3px", borderRadius: "2px", marginBottom: "6px",
                background: state === "done" ? "var(--gold-soft)" : state === "active" ? "var(--gold)" : "rgba(255,255,255,0.08)",
                boxShadow: state === "active" ? "0 0 8px rgba(255,184,0,0.35)" : "none",
              }} />
              <p style={{ fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: state === "active" ? "var(--gold)" : "var(--t3)", fontWeight: state === "active" ? 600 : 500 }}>{i + 1}</p>
              <p style={{ fontSize: "12px", fontWeight: 600, color: state === "active" ? "var(--t1)" : "var(--t2)", marginTop: "2px" }}>{label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Stat cards row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.4fr", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Pipeline",  value: stepsCompleted, denom: "/ 5",  sub: "steps done",    topColor: "var(--gold)",     prog: (stepsCompleted / 5) * 100    },
          { label: "Scheduled", value: scheduled,       denom: "",     sub: "in queue",      topColor: "var(--teal)",     prog: Math.min(scheduled * 20, 100)  },
          { label: "Published", value: published,       denom: "",     sub: "all time",      topColor: "var(--amber)",    prog: Math.min(published * 10, 100)  },
          { label: "Drafts",    value: topPosts.length, denom: "",     sub: "tracked",       topColor: "var(--purple-l)", prog: Math.min(topPosts.length * 10, 100) },
        ].map(({ label, value, denom, sub, topColor, prog }) => (
          <div key={label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: topColor }} />
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>{label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: "var(--t1)", lineHeight: 1 }}>{value}</span>
              {denom && <span style={{ fontSize: "13px", color: "var(--t3)" }}>{denom}</span>}
            </div>
            <p style={{ fontSize: "10px", color: "var(--t3)", marginBottom: "10px" }}>{sub}</p>
            <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", borderRadius: "2px", width: `${prog}%`, background: topColor, transition: "width 0.5s ease" }} />
            </div>
          </div>
        ))}
        {/* API Resources card */}
        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "12px" }}>API Resources</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { label: "Claude", pct: 35, color: "var(--gold)"     },
              { label: "Twitter", pct: 60, color: "var(--blue)"    },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: "var(--t2)" }}>{label}</span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono), monospace", color: "var(--t3)" }}>{pct}%</span>
                </div>
                <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.07)" }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${pct}%`, background: color, transition: "width 0.4s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions 4-col ── */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "12px" }}>Quick Actions</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon, bg, color }) => (
            <Link
              key={href}
              href={href}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", cursor: "pointer", textDecoration: "none", display: "block", transition: "border-color 0.12s, background 0.12s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,184,0,0.22)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; }}
            >
              <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <Icon size={14} strokeWidth={1.75} style={{ color }} />
              </div>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", marginBottom: "3px" }}>{label}</p>
              <p style={{ fontSize: "11px", color: "var(--t3)", lineHeight: 1.4 }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom row: Top Posts + Trigger ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>

        {/* Top performing posts */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={13} strokeWidth={1.75} style={{ color: "var(--green)" }} />
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--t3)" }}>Top Posts This Month</p>
          </div>
          {topPosts.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <LayoutGrid size={22} strokeWidth={1.5} style={{ color: "var(--t3)", margin: "0 auto 10px" }} />
              <p style={{ fontSize: "13px", color: "var(--t2)", marginBottom: "4px" }}>No posts yet</p>
              <p style={{ fontSize: "11px", color: "var(--t3)" }}>Analytics pull daily at 06:00 UTC</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0" }}>
              {topPosts.slice(0, 3).map((post, i) => (
                <div key={post.tweet_id} style={{ padding: "18px", position: "relative", borderRight: i < 2 ? "1px solid var(--border)" : "none", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,220,161,0.3), transparent)" }} />
                  <span style={{ fontSize: "10px", padding: "3px 7px", borderRadius: "4px", background: "rgba(29,161,242,0.1)", color: "var(--blue)", fontWeight: 600, letterSpacing: "0.4px" }}>X</span>
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.70)", lineHeight: 1.65, fontStyle: "italic", marginTop: "10px", marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    "{post.text}"
                  </p>
                  <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t2)" }}><Eye size={11} strokeWidth={1.75} />{post.impressions.toLocaleString()}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--gold)" }}><Heart size={11} strokeWidth={1.75} />{post.likes.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trigger + Niche */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Auto-poster trigger */}
          <button
            onClick={triggerAutoPoster}
            disabled={triggerState === "loading"}
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: "14px", padding: "20px",
              borderRadius: "12px", textAlign: "left", cursor: triggerState === "loading" ? "not-allowed" : "pointer",
              background: triggerState === "done" ? "rgba(34,197,94,0.08)" : triggerState === "error" ? "rgba(239,68,68,0.08)" : "var(--bg-card)",
              border: `1px solid ${triggerState === "done" ? "rgba(34,197,94,0.22)" : triggerState === "error" ? "rgba(239,68,68,0.22)" : "var(--border)"}`,
              opacity: triggerState === "loading" ? 0.6 : 1, transition: "all 0.15s",
            }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: triggerState === "done" ? "rgba(34,197,94,0.12)" : "rgba(255,184,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {triggerState === "done" ? <Check size={14} strokeWidth={2} style={{ color: "var(--green)" }} /> : <Zap size={14} strokeWidth={1.75} style={{ color: "var(--gold)" }} />}
            </div>
            <div>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: triggerState === "done" ? "var(--green)" : triggerState === "error" ? "var(--red)" : "var(--t1)", marginBottom: "2px" }}>
                {triggerState === "loading" ? "Posting…" : triggerState === "done" ? "Posted!" : "Trigger Auto-poster"}
              </p>
              <p style={{ fontSize: "11px", color: "var(--t3)" }}>
                {triggerState === "error" ? triggerError : "Post now from active project queue"}
              </p>
            </div>
          </button>

          {/* Niche intel shortcut */}
          <Link href="/niche" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border)", textDecoration: "none", transition: "border-color 0.12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,47,217,0.3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
          >
            <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(107,47,217,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Target size={14} strokeWidth={1.75} style={{ color: "var(--purple-l)" }} />
            </div>
            <div>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", marginBottom: "2px" }}>Niche Intelligence</p>
              <p style={{ fontSize: "11px", color: "var(--t3)" }}>Monitor competitors</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
    <StatusBar />
    </>
  );
}
