"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { api, TimelinePoint, PillarStat, BenchmarkData, TopPost } from "@/lib/api";
import { store } from "@/lib/store";
import { BarChart2 } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  accent:  "#7f77dd",
  green:   "#86efac",
  blue:    "#93c5fd",
  amber:   "#f5b84a",
  red:     "#fca5a5",
  muted:   "rgba(232,230,240,0.45)",
  subtle:  "rgba(232,230,240,0.25)",
  text:    "#e8e6f0",
  surface: "#17171c",
  border:  "rgba(255,255,255,0.07)",
};

const CHART_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "24px",
  marginBottom: "24px",
} as React.CSSProperties;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "16px", fontWeight: 600, color: T.text, marginBottom: "20px", letterSpacing: "-0.01em" }}>
      {children}
    </h3>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <p style={{ fontSize: "14px", color: T.muted }}>{message}</p>
    </div>
  );
}

// Custom tooltip matching dark theme
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px" }}>
      <p style={{ color: T.subtle, marginBottom: "6px" }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name}: <span style={{ color: T.text, fontWeight: 500 }}>{p.value.toLocaleString()}</span>
        </p>
      ))}
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
        } catch {
          /* benchmark optional */
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const hasTimeline = timeline.some(t => t.impressions > 0 || t.likes > 0);
  const hasFrequency = frequency.some(f => f.count > 0);
  const hasPillars = pillars.length > 0;
  const hasBenchmark = benchmark && (benchmark.competitors.length > 0 || benchmark.your_avg.post_count > 0);

  // Benchmark chart: one bar group per entry (you + competitors), showing avg_likes + avg_impressions
  const benchmarkData = benchmark
    ? [benchmark.your_avg, ...benchmark.competitors].map(e => ({
        name: e.handle === "You" ? "You" : `@${e.handle}`,
        likes: e.avg_likes ?? 0,
        impressions: e.avg_impressions ?? 0,
        noData: e.avg_likes === null && e.avg_impressions === null,
      }))
    : [];

  // Shorten dates for x-axis labels
  const timelineFormatted = timeline.map(t => ({
    ...t,
    label: t.date.slice(5), // "MM-DD"
  }));

  // Pillar bar colours cycle through accent shades
  const PILLAR_COLORS = [T.accent, T.blue, T.green, T.amber, T.red, "#c084fc", "#34d399"];

  return (
    <div style={{ padding: "52px 64px", maxWidth: "960px" }}>

      {/* Page header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <BarChart2 size={18} style={{ color: T.accent }} />
          <h2 style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: T.text }}>Analytics</h2>
        </div>
        <p style={{ fontSize: "15px", color: T.muted, marginLeft: "28px", lineHeight: 1.5 }}>
          {project?.name ? `${project.name} — ` : ""}performance overview
        </p>
      </div>

      {loading && (
        <div style={{ color: T.muted, fontSize: "14px", marginBottom: "32px" }}>Loading analytics…</div>
      )}

      {/* ── Section 1: My performance ────────────────────────────────────────── */}
      <div style={CHART_STYLE}>
        <SectionTitle>My performance — last 30 days</SectionTitle>

        {hasTimeline ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timelineFormatted} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: T.muted, paddingTop: "12px" }} />
              <Line type="monotone" dataKey="impressions" stroke={T.accent}  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="likes"       stroke={T.green}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="replies"     stroke={T.blue}    strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="retweets"    stroke={T.amber}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No analytics data yet. Post content and pull analytics to see your performance here." />
        )}

        {/* Posting frequency */}
        <div style={{ marginTop: "32px" }}>
          <p style={{ fontSize: "13px", fontWeight: 500, color: T.muted, marginBottom: "16px" }}>Posting frequency by day</p>
          {hasFrequency ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={frequency} margin={{ top: 0, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Posts" fill={T.accent} radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No posted content yet." />
          )}
        </div>
      </div>

      {/* ── Section 2: Best posts this month ────────────────────────────────── */}
      <div style={CHART_STYLE}>
        <SectionTitle>Best posts this month</SectionTitle>

        {topPosts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topPosts.map((post, i) => (
              <div
                key={post.tweet_id}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "10px", padding: "16px",
                  display: "flex", gap: "16px", alignItems: "flex-start",
                }}
              >
                {/* Rank */}
                <div style={{
                  minWidth: "28px", height: "28px", borderRadius: "8px",
                  background: i === 0 ? "var(--accent-dim)" : "var(--surface-3)",
                  border: `1px solid ${i === 0 ? "var(--accent-border)" : "var(--border-2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 600, color: i === 0 ? "var(--accent-light)" : T.muted,
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Pillar tag */}
                  {post.topic && (
                    <span style={{
                      display: "inline-block", marginBottom: "8px",
                      fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
                      background: "var(--accent-dim)", color: "var(--accent-light)", border: "1px solid var(--accent-border)",
                    }}>
                      {post.topic}
                    </span>
                  )}

                  {/* Text */}
                  <p style={{ fontSize: "13.5px", color: T.text, lineHeight: 1.6, marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.text ?? "—"}
                  </p>

                  {/* Metrics */}
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    {[
                      { label: "Impressions", value: post.impressions, color: T.accent },
                      { label: "Likes",       value: post.likes,       color: T.green  },
                      { label: "Replies",     value: post.replies,     color: T.blue   },
                      { label: "Retweets",    value: post.retweets,    color: T.amber  },
                    ].map(m => (
                      <div key={m.label}>
                        <p style={{ fontSize: "10px", color: T.subtle, marginBottom: "1px" }}>{m.label}</p>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: m.color }}>{m.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No posts with analytics this month yet." />
        )}
      </div>

      {/* ── Section 3: Pillar performance ───────────────────────────────────── */}
      <div style={CHART_STYLE}>
        <SectionTitle>Pillar performance — avg impressions</SectionTitle>

        {hasPillars ? (
          <ResponsiveContainer width="100%" height={Math.max(160, pillars.length * 40)}>
            <BarChart
              data={pillars}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
              <YAxis
                type="category" dataKey="pillar" width={140}
                tick={{ fontSize: 12, fill: T.muted }}
                tickLine={false} axisLine={false}
              />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="avg_impressions" name="Avg impressions" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {pillars.map((_, i) => (
                  <Cell key={i} fill={PILLAR_COLORS[i % PILLAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No pillar performance data yet. Once posts with analytics exist, you'll see which topics perform best." />
        )}
      </div>

      {/* ── Section 4: Competitor benchmark ─────────────────────────────────── */}
      <div style={CHART_STYLE}>
        <SectionTitle>Competitor benchmark</SectionTitle>

        {hasBenchmark && benchmarkData.length > 0 ? (
          <>
            {benchmark?.report_date && (
              <p style={{ fontSize: "12px", color: T.subtle, marginBottom: "16px" }}>
                Competitor data from last niche report: {benchmark.report_date}
              </p>
            )}

            {benchmarkData.every(d => d.noData) ? (
              <EmptyState message="Competitor engagement data not available. Niche reports need public_metrics in cached tweets to show this." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={benchmarkData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: T.subtle }} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: T.muted, paddingTop: "12px" }} />
                  <Bar dataKey="likes"       name="Avg likes"       fill={T.green}  radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="impressions" name="Avg impressions"  fill={T.accent} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <EmptyState message="No competitor data yet. Add watched accounts in Niche Intel and run a report to populate this section." />
        )}
      </div>
    </div>
  );
}
