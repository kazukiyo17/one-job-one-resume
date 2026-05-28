const STORAGE_KEY = "resume-promote:session-v1";

/**
 * @typedef {object} SessionResultPayload
 * @property {string} [optimizedText]
 * @property {string} [analysis]
 * @property {string} [suggestions]
 * @property {string} [html]
 * @property {'html'|'text'|'analysis'|'tips'} [activeTab]
 */

/**
 * @param {SessionResultPayload} payload
 */
export function saveSessionResults(payload) {
  const data = {
    v: 1,
    optimizedText: String(payload.optimizedText || ""),
    analysis: String(payload.analysis || ""),
    suggestions: String(payload.suggestions || ""),
    html: String(payload.html || ""),
    activeTab:
      payload.activeTab === "text" ||
      payload.activeTab === "analysis" ||
      payload.activeTab === "tips"
        ? payload.activeTab
        : "html",
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* 配额或隐私模式等：忽略 */
  }
}

/**
 * @returns {SessionResultPayload | null}
 */
export function loadSessionResults() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return {
      optimizedText: String(data.optimizedText || ""),
      analysis: String(data.analysis || ""),
      suggestions: String(data.suggestions || ""),
      html: String(data.html || ""),
      activeTab:
        data.activeTab === "text" ||
        data.activeTab === "analysis" ||
        data.activeTab === "tips"
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
  } catch {
    /* ignore */
  }
}
