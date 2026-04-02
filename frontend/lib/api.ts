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
    run: (query: string, sources: string[], subreddits?: string[], project_id?: number | null) =>
      request<{ query: string; data: Record<string, unknown>; research_id: number }>("/api/research/run", {
        method: "POST",
        body: JSON.stringify({ query, sources, subreddits: subreddits ?? [], project_id }),
      }),
    trending: () => request("/api/research/trending"),
  },

  insights: {
    analyze: (research_data: object, project_id?: number | null, research_id?: number | null) =>
      request("/api/insights/analyze", {
        method: "POST",
        body: JSON.stringify({ research_data, project_id, research_id }),
      }),
  },

  content: {
    generate: (topic: string, insights: object, platform = "x", project_id?: number | null) =>
      request("/api/content/generate", {
        method: "POST",
        body: JSON.stringify({ topic, insights, platform, project_id }),
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
};
