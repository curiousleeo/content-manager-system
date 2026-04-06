"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TopPost } from "@/lib/api";
import { store } from "@/lib/store";
import {
  Search, Lightbulb, PenLine, CheckCircle,
  Calendar, Check, TrendingUp, Eye, Heart, Zap,
  LayoutGrid, Share2,
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
  { href: "/research",  label: "Run Research",        desc: "Find trending angles for your niche",  icon: Search,   bg: "rgba(255,184,0,0.08)",  color: "var(--gold)"  },
  { href: "/content",   label: "Generate Batch",      desc: "Create multiple posts at once",        icon: Zap,      bg: "rgba(255,184,0,0.08)",  color: "var(--gold)"  },
  { href: "/schedule",  label: "Trigger Auto-poster", desc: "Post from active project queue",       icon: Share2,   bg: "rgba(255,184,0,0.08)",  color: "var(--gold)"  },
  { href: "/analytics", label: "View Calendar",       desc: "See your scheduled post timeline",     icon: Calendar, bg: "rgba(255,184,0,0.08)",  color: "var(--gold)"  },
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

  const scheduled      = posts.filter((p) => p.status === "scheduled").length;
  const published      = posts.filter((p) => p.status === "posted").length;
  const doneStates     = [pipeline.hasResearch, pipeline.hasInsights, pipeline.hasContent, false, false];
  const stepsCompleted = doneStates.filter(Boolean).length;
  const activeStep     = STEPS[stepsCompleted] ?? STEPS[0];

  // firstName kept for prop compatibility but greeting removed per prototype
  void firstName;

  return (
    <>
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Section 1: Pipeline Status ── */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "15px", color: "var(--t1)", margin: 0 }}>
            Pipeline Status
          </h2>
          <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--gold)" }}>
            Active Batch: &lsquo;Summer Launch&rsquo;
          </span>
        </div>

        {/* Pipeline bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "5px" }}>
          {STEPS.map(({ label }, i) => {
            const state = getState(i, doneStates);
            return (
              <div key={label}>
                <div style={{
                  height: "3px", borderRadius: "2px", marginBottom: "6px",
                  background: state === "done" ? "var(--gold-soft)" : state === "active" ? "var(--gold)" : "rgba(255,255,255,0.08)",
                  boxShadow: state === "active" ? "0 0 8px rgba(255,184,0,0.35)" : "none",
                }} />
                <p style={{
                  fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase",
                  color: state === "active" ? "var(--gold)" : "var(--t3)",
                  fontWeight: state === "active" ? 600 : 500,
                  margin: "0 0 2px",
                }}>
                  {i + 1}
                </p>
                <p style={{
                  fontSize: "12px", fontWeight: 600, margin: 0,
                  color: state === "active" ? "var(--t1)" : "var(--t2)",
                }}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.3fr", gap: "16px", marginBottom: "32px" }}>

        {/* Card 1 — Posts This Month */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "var(--gold)" }} />
          <p style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>Posts This Month</p>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: "var(--t1)", lineHeight: 1, margin: 0 }}>
            {published}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "7px" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2L8 6H2L5 2Z" fill="var(--gold-soft)" />
            </svg>
            <span style={{ fontSize: "10px", color: "var(--gold-soft)" }}>12% vs last</span>
          </div>
        </div>

        {/* Card 2 — Scheduled */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>Scheduled</p>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: "var(--t1)", lineHeight: 1, margin: 0 }}>
            {scheduled}
          </p>
          <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: "8px", margin: "8px 0 0" }}>Next: 2h 15m</p>
        </div>

        {/* Card 3 — Drafts Queued */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>Drafts Queued</p>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: "var(--t1)", lineHeight: 1, margin: 0 }}>
            {topPosts.length}
          </p>
          <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: "8px", margin: "8px 0 0" }}>Ready for review</p>
        </div>

        {/* Card 4 — Claude Calls */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>Claude Calls</p>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: "var(--t1)", lineHeight: 1, margin: 0 }}>
            1.2k
          </p>
          <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: "8px", margin: "8px 0 0" }}>Premium Tier</p>
        </div>

        {/* Card 5 — API Resources */}
        <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", color: "var(--t3)", marginBottom: "14px" }}>API Resources</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "X Posts API",        pct: 84, color: "var(--blue)"  },
              { label: "Claude-3.5-Sonnet",  pct: 45, color: "var(--gold)"  },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
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

      {/* ── Section 3: Quick Actions ── */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "15px", color: "var(--t1)", marginBottom: "14px" }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon, bg, color }) => (
            <Link
              key={href}
              href={href}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", cursor: "pointer", textDecoration: "none", display: "block", transition: "border-color 0.12s, background 0.12s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,184,0,0.22)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; }}
            >
              <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <Icon size={14} strokeWidth={1.75} style={{ color }} />
              </div>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", marginBottom: "3px" }}>{label}</p>
              <p style={{ fontSize: "11px", color: "var(--t3)", lineHeight: 1.4, margin: 0 }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 4: Top Performing Posts ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h2 style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: "15px", color: "var(--t1)", margin: 0 }}>
            Top Performing Posts
          </h2>
          <Link href="/analytics" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--gold)", textDecoration: "none" }}>
            View Analytics →
          </Link>
        </div>

        {topPosts.length === 0 ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "56px 0", textAlign: "center" }}>
            <LayoutGrid size={22} strokeWidth={1.5} style={{ color: "var(--t3)", margin: "0 auto 10px" }} />
            <p style={{ fontSize: "13px", color: "var(--t2)", marginBottom: "4px" }}>No posts yet</p>
            <p style={{ fontSize: "11px", color: "var(--t3)" }}>Analytics pull daily at 06:00 UTC</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
            {topPosts.slice(0, 3).map((post) => (
              <div key={post.tweet_id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", position: "relative", overflow: "hidden" }}>
                {/* Gold shimmer line */}
                <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,220,161,0.3), transparent)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ background: "rgba(29,161,242,0.1)", color: "var(--blue)", fontSize: "10px", padding: "3px 7px", borderRadius: "4px", fontWeight: 600 }}>
                    X Post
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--t3)" }}>
                    {post.posted_at ? new Date(post.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
                <p style={{ fontSize: "12.5px", fontStyle: "italic", color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  &ldquo;{post.text}&rdquo;
                </p>
                <div style={{ display: "flex", gap: "18px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t2)" }}>
                    <Eye size={11} strokeWidth={1.75} />{post.impressions.toLocaleString()}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--gold)" }}>
                    <Heart size={11} strokeWidth={1.75} />{post.likes.toLocaleString()}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--t2)" }}>
                    <TrendingUp size={11} strokeWidth={1.75} />{post.retweets?.toLocaleString() ?? "0"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trigger state error display */}
      {triggerState === "error" && triggerError && (
        <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px", color: "var(--red)", fontFamily: "var(--font-mono), monospace" }}>
          {triggerError}
        </div>
      )}

      {/* Hidden trigger button to keep triggerAutoPoster in scope */}
      <button onClick={triggerAutoPoster} disabled={triggerState === "loading"} style={{ display: "none" }} aria-hidden="true">
        {triggerState === "done" ? <Check size={14} /> : <Zap size={14} />}
      </button>

    </div>
    <StatusBar />
    </>
  );
}
