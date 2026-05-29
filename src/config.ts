function envBool(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
}

function readEnv(): WindowEnv {
  const runtime =
    typeof window !== "undefined" && window.__ENV__ ? window.__ENV__ : {};
  const built = import.meta.env;
  return {
    API_BASE: runtime.API_BASE ?? built.VITE_API_BASE ?? "",
    MOCK_OPTIMIZE: runtime.MOCK_OPTIMIZE ?? built.VITE_MOCK_OPTIMIZE,
    MOCK_DELAY_MS: runtime.MOCK_DELAY_MS ?? built.VITE_MOCK_DELAY_MS,
    MAX_FILE_BYTES: runtime.MAX_FILE_BYTES ?? built.VITE_MAX_FILE_BYTES,
    MAX_RESUME_TEXT_CHARS:
      runtime.MAX_RESUME_TEXT_CHARS ?? built.VITE_MAX_RESUME_TEXT_CHARS,
    MAX_JD_TEXT_CHARS:
      runtime.MAX_JD_TEXT_CHARS ?? built.VITE_MAX_JD_TEXT_CHARS,
    MAX_REQUEST_BYTES:
      runtime.MAX_REQUEST_BYTES ?? built.VITE_MAX_REQUEST_BYTES,
  };
}

export function getConfig() {
  const env = readEnv();
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
    timeoutMs: 180_000,
    mockOptimize: envBool(env.MOCK_OPTIMIZE),
    mockDelayMs,
  };
}

export function getOptimizeUrl() {
  const { apiBase, optimizePath } = getConfig();
  if (!apiBase) return optimizePath;
  return `${apiBase.replace(/\/$/, "")}${optimizePath}`;
}

export function getLimitsEnv() {
  return readEnv();
}
