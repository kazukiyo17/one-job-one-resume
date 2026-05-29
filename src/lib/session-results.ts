import type { ResumeData } from "./resume/types";

const STORAGE_KEY = "resume-promote:session-v2";

export type TabId = "html" | "analysis" | "tips";

export type SessionResultPayload = {
  resume?: ResumeData | null;
  analysis?: string;
  suggestions?: string;
  activeTab?: TabId;
};

export function saveSessionResults(payload: SessionResultPayload) {
  const data = {
    v: 2,
    resume:
      payload.resume && typeof payload.resume === "object"
        ? payload.resume
        : null,
    analysis: String(payload.analysis || ""),
    suggestions: String(payload.suggestions || ""),
    activeTab:
      payload.activeTab === "analysis" || payload.activeTab === "tips"
        ? payload.activeTab
        : "html",
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadSessionResults(): SessionResultPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 2) return null;
    return {
      resume:
        data.resume && typeof data.resume === "object" ? data.resume : null,
      analysis: String(data.analysis || ""),
      suggestions: String(data.suggestions || ""),
      activeTab:
        data.activeTab === "analysis" || data.activeTab === "tips"
          ? data.activeTab
          : "html",
    };
  } catch {
    return null;
  }
}

export function clearSessionResults() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("resume-promote:session-v1");
  } catch {
    /* ignore */
  }
}

/** 是否存在可进入工作台的本地缓存（需含有效 resume） */
export function hasCachedSessionResults(): boolean {
  const saved = loadSessionResults();
  if (!saved?.resume) return false;
  const resume = saved.resume as Record<string, unknown>;
  return Boolean(resume && typeof resume === "object");
}
