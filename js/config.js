/**
 * API_BASE：后端根地址，勿包含末尾斜杠。与静态页同源时可留空，请求将发往 /api/optimize。
 */
function envBool(v) {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
}

export function getConfig() {
  const env =
    typeof window !== "undefined" && window.__ENV__ ? window.__ENV__ : {};
  const mockDelayRaw = env.MOCK_DELAY_MS;
  const mockDelayMs =
    typeof mockDelayRaw === "number" && Number.isFinite(mockDelayRaw)
      ? Math.max(0, mockDelayRaw)
      : typeof mockDelayRaw === "string"
        ? Math.max(0, parseInt(mockDelayRaw, 10) || 0)
        : 0;
  return {
    apiBase: typeof env.API_BASE === "string" ? env.API_BASE.trim() : "",
    optimizePath: "/api/optimize",
    timeoutMs: 180000,
    /** 为 true 时 postOptimize 不请求网络，返回本地 mock（见 js/api/mock-optimize.js） */
    mockOptimize: envBool(env.MOCK_OPTIMIZE),
    /** mock 返回前延迟毫秒数，模拟等待；0 为立即返回 */
    mockDelayMs,
  };
}

export function getOptimizeUrl() {
  const { apiBase, optimizePath } = getConfig();
  if (!apiBase) return optimizePath;
  return `${apiBase.replace(/\/$/, "")}${optimizePath}`;
}
