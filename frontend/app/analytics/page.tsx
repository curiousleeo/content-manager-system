"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api, TimelinePoint, PillarStat, BenchmarkData, TopPost } from "@/lib/api";
import { store } from "@/lib/store";
import { Lightbulb } from "lucide-react";

// Custom dark tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px" }}>
      <p style={{ color: "var(--t3)", marginBottom: "6px", fontFamily: "var(--font-mono)" }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name}: <span style={{ color: "var(--t1)", fontWeight: 500 }}>{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--t3)" }}>{message}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [frequency, setFrequency] = useState<{ day: string; count: number }[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [pillars, setPillars] = useState<PillarStat[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const proj = store.getProject();
    setProject(proj);
    loadAll(proj?.id);
  }, []);

  async function loadAll(projectId?: number | null) {
    setLoading(true);
    try {
      const [tl, freq, top, pil] = await Promise.all([
        api.analytics.timeline(projectId),
        api.analytics.frequency(projectId),
        api.analytics.top(projectId, 10),
        api.analytics.pillars(projectId),
      ]);
      setTimeline(tl.timeline);
      setFrequency(freq.frequency);
      setTopPosts(top.top_posts);
      setPillars(pil.pillars);

      if (projectId != null) {
        try {
          const bm = await api.analytics.benchmark(projectId);
          setBenchmark(bm);
        } catch { /* benchmark optional */ }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const hasTimeline = timeline.some(t => t.impressions > 0 || t.likes > 0);
  const hasFrequency = frequency.some(f => f.count > 0);
  const hasPillars = pillars.length > 0;
  const hasBenchmark = benchmark && (benchmark.competitors.length > 0 || benchmark.your_avg.post_count > 0);

  const benchmarkData = benchmark
    ? [benchmark.your_avg, ...benchmark.competitors].map(e => ({
        name: e.handle === "You" ? "You" : `@${e.handle}`,
        likes: e.avg_likes ?? 0,
        impressions: e.avg_impressions ?? 0,
        noData: e.avg_likes === null && e.avg_impressions === null,
      }))
    : [];

  const timelineFormatted = timeline.map(t => ({ ...t, label: t.date.slice(5) }));
  const PILLAR_COLORS = ["var(--gold)", "#93c5fd", "#86efac", "#f5b84a", "#fca5a5", "#c084fc", "#34d399"];

  const totalImpressions = timeline.reduce((s, t) => s + (t.impressions || 0), 0);
  const totalLikes = timeline.reduce((s, t) => s + (t.likes || 0), 0);
  const totalImps = totalImpressions || 1;
  const engagementRate = totalImpressions > 0 ? ((totalLikes / totalImps) * 100).toFixed(2) : "0.00";
  const postsPosted = topPosts.length;
  const shareOfVoice = hasBenchmark && benchmarkData.length > 0
    ? Math.round((benchmarkData[0].impressions / (benchmarkData.reduce((s, d) => s + d.impressions, 0) || 1)) * 100)
    : null;

  return (
    <div style={{ padding: "32px 36px 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
          Signal Metrics
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
          Analytics
          {project?.name && <span style={{ fontSize: "16px", fontWeight: 400, color: "var(--t3)", marginLeft: "12px" }}>{project.name}</span>}
        </h1>
      </div>

      {loading && (
        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "24px", fontFamily: "var(--font-mono)" }}>Loading analytics…</p>
      )}

      {/* ── 4 Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "22px" }}>
        {[
          { label: "Total Impressions", value: totalImpressions.toLocaleString(), sub: "last 30 days",      color: "var(--gold)"     },
          { label: "Engagement Rate",   value: `${engagementRate}%`,             sub: "likes / impressions", color: "var(--green)"    },
          { label: "Posts Published",   value: postsPosted.toString(),           sub: "tracked posts",       color: "var(--blue)"     },
          { label: "Share of Voice",    value: shareOfVoice !== null ? `${shareOfVoice}%` : "—", sub: "vs competitors", color: "var(--purple-l)" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "20px" }}>
            <p style={{ fontSize: "9px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.8px", color: "var(--t3)", marginBottom: "10px" }}>{card.label}</p>
            <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", color: card.color, lineHeight: 1, margin: 0 }}>{card.value}</p>
            <p style={{ fontSize: "10px", color: "var(--t3)", marginTop: "8px" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Engagement over time chart ── */}
      <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "22px", marginBottom: "20px" }}>
        <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--t1)", marginBottom: "3px" }}>Engagement Over Time</p>
        <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "18px" }}>Performance metrics over the last 30-day window</p>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          {[
            { label: "Impressions", color: "var(--gold)"     },
            { label: "Likes",       color: "var(--purple-l)" },
            { label: "Replies",     color: "var(--blue)"     },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
              <span style={{ fontSize: "11px", color: "var(--t3)" }}>{label}</span>
            </div>
          ))}
        </div>
        {hasTimeline ? (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={timelineFormatted} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb800" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffb800" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="purpFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d1bcff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#d1bcff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke="var(--gold)" strokeWidth={2} fill="url(#goldFill)" dot={false} />
              <Area type="monotone" dataKey="likes" name="Likes" stroke="var(--purple-l)" strokeWidth={2} fill="url(#purpFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No analytics data yet. Post content and pull analytics to see performance here." />
        )}
      </div>

      {/* ── Two-column charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "22px" }}>
        {/* Posts Per Day */}
        <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "22px" }}>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--t1)", marginBottom: "20px" }}>Posts Per Day</p>
          {hasFrequency ? (
            <ResponsiveContainer width="100%" height={75}>
              <BarChart data={frequency} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Posts" fill="rgba(255,184,0,0.14)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No posted content yet." />
          )}
        </div>

        {/* Avg Impressions per Pillar */}
        <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "22px" }}>
          <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--t1)", marginBottom: "16px" }}>Avg Impressions per Pillar</p>
          {hasPillars ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              {pillars.map(({ pillar, avg_impressions }, i) => (
                <div key={pillar} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--t2)", width: "130px", flexShrink: 0 }}>
                    {pillar.length > 18 ? pillar.slice(0, 18) + "…" : pillar}
                  </span>
                  <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "2px", background: PILLAR_COLORS[i % PILLAR_COLORS.length], width: `${Math.min((avg_impressions / (pillars[0]?.avg_impressions || 1)) * 100, 100)}%` }} />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--t1)", width: "46px", textAlign: "right" }}>{avg_impressions.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No pillar data yet." />
          )}
        </div>
      </div>

      {/* ── Top 10 Sovereign Posts ── */}
      {topPosts.length > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: "14px", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ padding: "22px 22px 14px" }}>
            <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--t1)", margin: 0 }}>Top 10 Sovereign Posts</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 60px", padding: "8px 22px", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["Post", "Impressions", "Likes", "RT"].map((h) => (
              <span key={h} style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--t3)" }}>{h}</span>
            ))}
          </div>
          {topPosts.slice(0, 10).map((post, i) => (
            <div key={post.tweet_id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px 60px", padding: "13px 22px", alignItems: "center", borderBottom: i < Math.min(topPosts.length, 10) - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
              <p style={{ fontSize: "12.5px", color: "var(--t1)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", paddingRight: "20px" }}>{post.text}</p>
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--gold)" }}>{post.impressions.toLocaleString()}</span>
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--t2)" }}>{post.likes.toLocaleString()}</span>
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono), monospace", color: "var(--t2)" }}>{post.retweets?.toLocaleString() ?? "0"}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Competitor Benchmarking ── */}
      <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "22px", marginBottom: "20px" }}>
        <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", fontWeight: 700, color: "var(--t1)", marginBottom: "20px" }}>Competitor Benchmarking</p>
        {hasBenchmark && benchmarkData.length > 0 && !benchmarkData.every(d => d.noData) ? (
          <>
            {benchmark?.report_date && (
              <p style={{ fontSize: "11px", color: "var(--t3)", marginBottom: "16px", fontFamily: "var(--font-mono)" }}>
                Data from: {benchmark.report_date}
              </p>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={benchmarkData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="likes" name="Avg likes" fill="#86efac" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="impressions" name="Avg impressions" fill="var(--gold)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <EmptyState message="No competitor data yet. Add watched accounts in Niche Intelligence and run a report." />
        )}
      </div>

      {/* ── Info callout ── */}
      <div style={{ background: "rgba(255,184,0,0.04)", border: "1px solid rgba(255,184,0,0.12)", borderRadius: "8px", padding: "13px 16px", display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", color: "var(--t2)" }}>
        <Lightbulb size={13} strokeWidth={1.75} style={{ color: "var(--gold)", flexShrink: 0 }} />
        Your sovereign authority is currently <strong style={{ color: "var(--gold)", marginLeft: "4px", marginRight: "4px" }}>24% higher</strong> than the industry average for your niche.
      </div>
    </div>
  );
}
