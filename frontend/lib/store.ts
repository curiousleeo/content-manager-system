"use client";

const KEYS = {
  research: "cms_research",
  insights: "cms_insights",
  content: "cms_content",
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
  default_subreddits?: string[];
  default_platform?: string;
  posting_days?: string[];
  posting_times?: string[];
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
  setResearch: (data: object) => ls.set(KEYS.research, JSON.stringify(data)),
  getResearch: () => {
    const v = ls.get(KEYS.research);
    return v ? JSON.parse(v) : null;
  },
  setInsights: (data: object) => ls.set(KEYS.insights, JSON.stringify(data)),
  getInsights: () => {
    const v = ls.get(KEYS.insights);
    return v ? JSON.parse(v) : null;
  },
  setContent: (text: string) => ls.set(KEYS.content, text),
  getContent: () => ls.get(KEYS.content) ?? "",
  setProject: (project: Project) => ls.set(KEYS.project, JSON.stringify(project)),
  getProject: (): Project | null => {
    const v = ls.get(KEYS.project);
    return v ? JSON.parse(v) : null;
  },
  clearProject: () => ls.remove(KEYS.project),
};
