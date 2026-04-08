"use client";

const KEYS = {
  research: "cms_research",
  research_id: "cms_research_id",
  insights: "cms_insights",
  content: "cms_content",
  draft_id: "cms_draft_id",
  project: "cms_project",
} as const;

export interface Project {
  id: number;
  name: string;
  description?: string;
  tone?: string;
  style?: string;
  avoid?: string;
  target_audience?: string;
  content_pillars?: string[];
  default_platform?: string;
  posting_days?: string[];
  posting_times?: string[];
  coingecko_enabled?: boolean;
  telegram_channels?: string[];
  timezone?: string;
  x_bearer_token?: string;
}

const ls = {
  get: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
  set: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  },
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
};

export const store = {
  // Research
  setResearch: (data: object, id?: number) => {
    ls.set(KEYS.research, JSON.stringify(data));
    if (id != null) ls.set(KEYS.research_id, String(id));
  },
  getResearch: () => {
    const v = ls.get(KEYS.research);
    return v ? JSON.parse(v) : null;
  },
  getResearchId: (): number | null => {
    const v = ls.get(KEYS.research_id);
    return v ? parseInt(v) : null;
  },
  setResearchId: (id: number) => ls.set(KEYS.research_id, String(id)),

  // Insights
  setInsights: (data: object) => ls.set(KEYS.insights, JSON.stringify(data)),
  getInsights: () => {
    const v = ls.get(KEYS.insights);
    return v ? JSON.parse(v) : null;
  },

  // Content + draft tracking
  setContent: (text: string) => ls.set(KEYS.content, text),
  getContent: () => ls.get(KEYS.content) ?? "",
  setDraftId: (id: number) => ls.set(KEYS.draft_id, String(id)),
  getDraftId: (): number | null => {
    const v = ls.get(KEYS.draft_id);
    return v ? parseInt(v) : null;
  },
  clearDraftId: () => ls.remove(KEYS.draft_id),

  // Project
  setProject: (project: Project) => ls.set(KEYS.project, JSON.stringify(project)),
  getProject: (): Project | null => {
    const v = ls.get(KEYS.project);
    return v ? JSON.parse(v) : null;
  },
  clearProject: () => ls.remove(KEYS.project),
};
