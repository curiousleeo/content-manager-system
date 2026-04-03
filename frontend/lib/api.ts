const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  projects: {
    list: () => request("/api/projects/"),
    get: (id: number) => request(`/api/projects/${id}`),
    create: (data: object) =>
      request("/api/projects/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) =>
      request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request(`/api/projects/${id}`, { method: "DELETE" }),
  },

  research: {
    run: (query: string, sources: string[], project_id?: number | null) =>
      request<{ query: string; data: Record<string, unknown>; research_id: number }>("/api/research/run", {
        method: "POST",
        body: JSON.stringify({ query, sources, project_id }),
      }),
    paste: (text: string, query: string, project_id?: number | null) =>
      request<{ research_id: number; query: string; source: string }>("/api/research/paste", {
        method: "POST",
        body: JSON.stringify({ text, query, project_id }),
      }),
    latest: (project_id?: number | null) =>
      request<{ research_id: number | null; query: string | null; data: Record<string, unknown> | null; created_at: string | null }>(
        `/api/research/latest${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
  },

  insights: {
    analyze: (research_data: object, project_id?: number | null, research_id?: number | null) =>
      request<{ insights: Record<string, unknown> }>("/api/insights/analyze", {
        method: "POST",
        body: JSON.stringify({ research_data, project_id, research_id }),
      }),
    latest: (project_id?: number | null) =>
      request<{ insights: Record<string, unknown> | null; research_id: number | null; query: string | null; created_at: string | null }>(
        `/api/insights/latest${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
  },

  content: {
    generate: (topic: string, insights: object, platform = "x", project_id?: number | null) =>
      request<{ platform: string; text: string }>("/api/content/generate", {
        method: "POST",
        body: JSON.stringify({ topic, insights, platform, project_id }),
      }),
    batchGenerate: (insights: object, platform = "x", project_id?: number | null, count = 15, pillars?: string[]) =>
      request<{ drafts: Draft[] }>("/api/content/batch-generate", {
        method: "POST",
        body: JSON.stringify({ insights, platform, project_id, count, pillars }),
      }),
    drafts: (project_id?: number | null) =>
      request<{ drafts: Draft[] }>(
        `/api/content/drafts${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
    setAutoQueue: (draft_id: number, enabled: boolean) =>
      request<{ id: number; auto_queue: boolean }>(`/api/content/${draft_id}/auto-queue`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    saveDraft: (text: string, topic: string, platform = "x", project_id?: number | null, auto_queue = false) =>
      request<Draft>("/api/content/save-draft", {
        method: "POST",
        body: JSON.stringify({ text, topic, platform, project_id, auto_queue }),
      }),
    deleteDraft: (draft_id: number) =>
      request(`/api/content/${draft_id}`, { method: "DELETE" }),
    bulkDelete: (ids: number[]) =>
      request("/api/content/bulk", {
        method: "DELETE",
        body: JSON.stringify(ids),
      }),
    postNow: (text: string, platform = "x", project_id?: number | null) =>
      request("/api/content/post-now", {
        method: "POST",
        body: JSON.stringify({ text, platform, project_id }),
      }),
  },

  review: {
    check: (text: string, platform = "x", project_id?: number | null, draft_id?: number | null) =>
      request<{ review: Record<string, unknown>; draft_id: number | null }>("/api/review/check", {
        method: "POST",
        body: JSON.stringify({ text, platform, project_id, draft_id }),
      }),
  },

  notifications: {
    list: (project_id?: number) => request<{
      notifications: { id: number; type: string; title: string; message: string; read: boolean; created_at: string }[];
      unread_count: number;
      usage: { service: string; label: string; count: number; limit: number; pct: number }[];
    }>(`/api/notifications${project_id != null ? `?project_id=${project_id}` : ""}`),
    markAllRead: () => request("/api/notifications/mark-read", { method: "POST" }),
    delete: (id: number) => request(`/api/notifications/${id}`, { method: "DELETE" }),
  },

  scheduler: {
    schedule: (text: string, scheduled_at: string, platform = "x", project_id?: number | null) =>
      request("/api/scheduler/schedule", {
        method: "POST",
        body: JSON.stringify({ text, platform, scheduled_at, project_id }),
      }),
    list: (project_id?: number | null) =>
      request(`/api/scheduler/list${project_id ? `?project_id=${project_id}` : ""}`),
    cancel: (job_id: string) =>
      request(`/api/scheduler/${job_id}`, { method: "DELETE" }),
  },

  analytics: {
    posts: (project_id?: number | null) =>
      request<{ analytics: AnalyticsRow[] }>(
        `/api/analytics/posts${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
    top: (project_id?: number | null, limit = 10) =>
      request<{ top_posts: TopPost[] }>(
        `/api/analytics/top?limit=${limit}${project_id != null ? `&project_id=${project_id}` : ""}`
      ),
    timeline: (project_id?: number | null, days = 30) =>
      request<{ timeline: TimelinePoint[] }>(
        `/api/analytics/timeline?days=${days}${project_id != null ? `&project_id=${project_id}` : ""}`
      ),
    frequency: (project_id?: number | null) =>
      request<{ frequency: { day: string; count: number }[] }>(
        `/api/analytics/frequency${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
    pillars: (project_id?: number | null) =>
      request<{ pillars: PillarStat[] }>(
        `/api/analytics/pillars${project_id != null ? `?project_id=${project_id}` : ""}`
      ),
    benchmark: (project_id: number) =>
      request<BenchmarkData>(`/api/analytics/benchmark?project_id=${project_id}`),
  },

  calendar: {
    list: (project_id: number | null | undefined, year: number, month: number) =>
      request<{ posts: CalendarPost[] }>(
        `/api/calendar/posts?year=${year}&month=${month}${project_id != null ? `&project_id=${project_id}` : ""}`
      ),
    reschedule: (draft_id: number, scheduled_at: string) =>
      request<CalendarPost>(`/api/calendar/${draft_id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ scheduled_at }),
      }),
  },

  niche: {
    listAccounts: (project_id: number) =>
      request<{ accounts: { id: number; x_handle: string; category: string; added_at: string; fetched_at: string | null }[] }>(
        `/api/niche/accounts?project_id=${project_id}`
      ),
    addAccount: (project_id: number, x_handle: string, category: string) =>
      request("/api/niche/accounts", {
        method: "POST",
        body: JSON.stringify({ project_id, x_handle, category }),
      }),
    removeAccount: (id: number) =>
      request(`/api/niche/accounts/${id}`, { method: "DELETE" }),
    cacheStatus: (project_id: number) =>
      request<{ accounts: CacheStatusItem[]; api_calls_needed: number; estimated_cost_usd: number }>(
        `/api/niche/cache-status?project_id=${project_id}`
      ),
    runReport: (project_id: number, force = false) =>
      request<NicheReportData & { fetch_summary: unknown[]; api_calls_made: number }>(
        `/api/niche/report?project_id=${project_id}&force=${force}`, { method: "POST" }
      ),
    latestReport: (project_id: number) =>
      request<{ report: NicheReportData | null }>(`/api/niche/report/latest?project_id=${project_id}`),
    pendingReports: (project_id: number) =>
      request<{ reports: NicheReportData[] }>(`/api/niche/report/pending?project_id=${project_id}`),
    allReports: (project_id: number) =>
      request<{ reports: NicheReportData[] }>(`/api/niche/report/all?project_id=${project_id}`),
    inject: (report_id: number) =>
      request<{ status: string; report_id: number }>(`/api/niche/report/${report_id}/inject`, { method: "POST" }),
    discard: (report_id: number) =>
      request<{ status: string; report_id: number }>(`/api/niche/report/${report_id}/discard`, { method: "POST" }),
  },
};

export interface Draft {
  id: number;
  topic: string;
  platform: string;
  text: string;
  status: string;
  auto_queue: boolean;
  tweet_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string | null;
}

export interface AnalyticsRow {
  tweet_id: string;
  draft_id: number | null;
  text: string | null;
  posted_at: string | null;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  pulled_at: string;
}

export interface TopPost {
  tweet_id: string;
  text: string | null;
  topic: string | null;
  posted_at: string | null;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
}

export interface TimelinePoint {
  date: string;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  count: number;
}

export interface PillarStat {
  pillar: string;
  avg_impressions: number;
  post_count: number;
}

export interface BenchmarkEntry {
  handle: string;
  avg_likes: number | null;
  avg_impressions: number | null;
  post_count: number;
}

export interface BenchmarkData {
  your_avg: BenchmarkEntry;
  competitors: BenchmarkEntry[];
  report_date: string | null;
}

export interface CalendarPost {
  id: number;
  status: string;
  text: string;
  topic: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string | null;
}

export interface CacheStatusItem {
  handle: string;
  status: "never_fetched" | "cached" | "stale" | "fetched_today";
  label: string;
  days_ago: number | null;
  can_refetch: boolean;
}

export interface NicheReportData {
  id: number;
  project_id: number;
  report_date: string;
  accounts_analyzed: number;
  hook_patterns: { type: string; frequency: number; effectiveness: string; example: string }[];
  dominant_tone: string;
  post_formats: { format: string; frequency: number; best_for: string }[];
  top_insights: string[];
  swipe_file: { handle: string; text: string; hook_type: string; why: string }[];
  status: "pending" | "injected" | "discarded";
  created_at: string;
}
