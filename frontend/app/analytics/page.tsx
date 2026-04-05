"use client";

import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api, TimelinePoint, PillarStat, BenchmarkData, TopPost } from "@/lib/api";
import { store } from "@/lib/store";

// Custom dark tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px" }}>
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

  const timelineFormatted = timeline.map(t => ({
    ...t,
    label: t.date.slice(5),
  }));

  const PILLAR_COLORS = ["var(--gold)", "#93c5fd", "#86efac", "#f5b84a", "#fca5a5", "#c084fc", "#34d399"];

  // Compute stat card values
  const totalImpressions = timeline.reduce((s, t) => s + (t.impressions || 0), 0);
  const totalLikes = timeline.reduce((s, t) => s + (t.likes || 0), 0);
  const totalImps = totalImpressions || 1;
  const engagementRate = totalImpressions > 0 ? ((totalLikes / totalImps) * 100).toFixed(2) : "0.00";
  const postsPosted = topPosts.length;
  const shareOfVoice = hasBenchmark && benchmarkData.length > 0
    ? Math.round((benchmarkData[0].impressions / (benchmarkData.reduce((s, d) => s + d.impressions, 0) || 1)) * 100)
    : null;

  return (
    <div style={{ padding: "40px 48px", maxWidth: "1080px" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "2.8px", color: "var(--gold)", fontFamily: "var(--font-manrope)", textTransform: "uppercase", marginBottom: "8px" }}>
          SIGNAL METRICS
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: "var(--t1)", letterSpacing: "-0.03em", margin: 0 }}>
          Analytics
          {project?.name && <span style={{ fontSize: "16px", fontWeight: 400, color: "var(--t3)", marginLeft: "12px" }}>{project.name}</span>}
        </h1>
      </div>

      {loading && (
        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "24px", fontFamily: "var(--font-mono)" }}>Loading analytics…</p>
      )}

      {/* 4 Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Impressions", value: totalImpressions.toLocaleString(), sub: "last 30 days", color: "var(--gold)" },
          { label: "Engagement Rate", value: `${engagementRate}%`, sub: "likes / impressions", color: "#86efac" },
          { label: "Posts Published", value: postsPosted.toString(), sub: "tracked posts", color: "#93c5fd" },
          { label: "Share of Voice", value: shareOfVoice !== null ? `${shareOfVoice}%` : "—", sub: "vs competitors", color: "#c084fc" },
        ].map(card => (
          <div key={card.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "18px 20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--t3)", marginBottom: "10px" }}>{card.label}</p>
            <p style={{ fontSize: "26px", fontWeight: 800, fontFamily: "var(--font-manrope)", color: card.color, margin: 0 }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "var(--ti)", marginTop: "4px" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Area chart — impressions over time */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", marginBottom: "20px", fontFamily: "var(--font-manrope)" }}>Performance — last 30 days</p>
        {hasTimeline ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineFormatted} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffb800" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffb800" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#86efac" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#86efac" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke="var(--gold)" strokeWidth={2} fill="url(#goldFill)" dot={false} />
              <Area type="monotone" dataKey="likes" name="Likes" stroke="#86efac" strokeWidth={2} fill="url(#greenFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No analytics data yet. Post content and pull analytics to see performance here." />
        )}
      </div>

      {/* Two-column: posting freq + pillar performance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Posts Per Day */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", marginBottom: "20px", fontFamily: "var(--font-manrope)" }}>Posts Per Day</p>
          {hasFrequency ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={frequency} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Posts" fill="var(--gold)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No posted content yet." />
          )}
        </div>

        {/* Avg Impressions per Pillar */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", marginBottom: "20px", fontFamily: "var(--font-manrope)" }}>Avg Impressions per Pillar</p>
          {hasPillars ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={pillars} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(232,230,240,0.3)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="pillar" width={110} tick={{ fontSize: 10, fill: "rgba(232,230,240,0.5)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="avg_impressions" name="Avg impressions" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {pillars.map((_, i) => (
                    <Cell key={i} fill={PILLAR_COLORS[i % PILLAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No pillar data yet." />
          )}
        </div>
      </div>

      {/* Competitor benchmark */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", marginBottom: "20px", fontFamily: "var(--font-manrope)" }}>Competitor Benchmark</p>
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

      {/* Info callout */}
      <div style={{ background: "rgba(107,47,217,0.08)", border: "1px solid rgba(107,47,217,0.2)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--purple-l)", flexShrink: 0 }} />
        <p style={{ fontSize: "12px", color: "var(--purple-l)", lineHeight: 1.5 }}>
          Analytics are pulled from your connected Twitter/X account. Post engagement metrics update hourly after publishing.
        </p>
      </div>
    </div>
  );
}
