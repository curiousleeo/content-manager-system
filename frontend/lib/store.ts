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

export const store = {
  setResearch: (data: object) =>
    localStorage.setItem(KEYS.research, JSON.stringify(data)),
  getResearch: () => {
    const v = localStorage.getItem(KEYS.research);
    return v ? JSON.parse(v) : null;
  },
  setInsights: (data: object) =>
    localStorage.setItem(KEYS.insights, JSON.stringify(data)),
  getInsights: () => {
    const v = localStorage.getItem(KEYS.insights);
    return v ? JSON.parse(v) : null;
  },
  setContent: (text: string) => localStorage.setItem(KEYS.content, text),
  getContent: () => localStorage.getItem(KEYS.content) ?? "",
  setProject: (project: Project) =>
    localStorage.setItem(KEYS.project, JSON.stringify(project)),
  getProject: (): Project | null => {
    const v = localStorage.getItem(KEYS.project);
    return v ? JSON.parse(v) : null;
  },
  clearProject: () => localStorage.removeItem(KEYS.project),
};
