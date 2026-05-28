/**
 * EdgeOne Pages KV · 固定窗口限流（支持按 IP + 全站）。
 * 绑定变量名由 RATE_LIMIT_KV_BINDING 指定（默认 RESUME_PROMOTE_KV）。
 */

const DEFAULT_BINDING = "RESUME_PROMOTE_KV";
const DEFAULT_IP_MAX_REQUESTS = 10;
const DEFAULT_GLOBAL_MAX_REQUESTS = 0;
const DEFAULT_WINDOW_SEC = 3600;
const DEFAULT_KEY_PREFIX = "optimize";

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const n =
    typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 */
function parseBool(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return fallback;
}

/**
 * @param {Record<string, unknown>} env
 */
export function getRateLimitConfig(env) {
  const sharedWindowSec = parsePositiveInt(
    env.RATE_LIMIT_WINDOW_SEC,
    DEFAULT_WINDOW_SEC,
  );
  const ipMaxRequests = parsePositiveInt(
    env.RATE_LIMIT_IP_MAX_REQUESTS ?? env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_IP_MAX_REQUESTS,
  );
  const globalMaxRequests = parsePositiveInt(
    env.RATE_LIMIT_GLOBAL_MAX_REQUESTS,
    DEFAULT_GLOBAL_MAX_REQUESTS,
  );
  const ipWindowSec = parsePositiveInt(
    env.RATE_LIMIT_IP_WINDOW_SEC,
    sharedWindowSec,
  );
  const globalWindowSec = parsePositiveInt(
    env.RATE_LIMIT_GLOBAL_WINDOW_SEC,
    sharedWindowSec,
  );
  const bindingName =
    String(env.RATE_LIMIT_KV_BINDING || DEFAULT_BINDING).trim() ||
    DEFAULT_BINDING;
  const keyPrefix =
    String(env.RATE_LIMIT_KEY_PREFIX || DEFAULT_KEY_PREFIX).trim() ||
    DEFAULT_KEY_PREFIX;
  const failOpen = parseBool(env.RATE_LIMIT_FAIL_OPEN, true);

  const ipEnabled = ipMaxRequests > 0 && ipWindowSec > 0;
  const globalEnabled = globalMaxRequests > 0 && globalWindowSec > 0;
  const enabled =
    parseBool(env.RATE_LIMIT_ENABLED, ipEnabled || globalEnabled) &&
    (ipEnabled || globalEnabled);

  return {
    enabled,
    ip: {
      enabled: ipEnabled,
      maxRequests: ipMaxRequests,
      windowSec: ipWindowSec,
    },
    global: {
      enabled: globalEnabled,
      maxRequests: globalMaxRequests,
      windowSec: globalWindowSec,
    },
    bindingName,
    keyPrefix,
    failOpen,
  };
}

/**
 * @typedef {{ get: (key: string, options?: { type?: string }) => Promise<unknown>, put: (key: string, value: string) => Promise<void> }} KvClient
 */

/**
 * @param {Record<string, unknown>} env
 * @returns {KvClient | null}
 */
export function resolveRateLimitKv(env) {
  const { bindingName } = getRateLimitConfig(env);
  const fromEnv = env[bindingName];
  if (
    fromEnv &&
    typeof fromEnv === "object" &&
    typeof /** @type {KvClient} */ (fromEnv).get === "function"
  ) {
    return /** @type {KvClient} */ (fromEnv);
  }
  const fromGlobal = globalThis[bindingName];
  if (
    fromGlobal &&
    typeof fromGlobal === "object" &&
    typeof /** @type {KvClient} */ (fromGlobal).get === "function"
  ) {
    return /** @type {KvClient} */ (fromGlobal);
  }
  return null;
}

/**
 * @param {Request} request
 */
function getClientIp(request) {
  const headers = [
    "eo-connecting-ip",
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];
  for (const name of headers) {
    const raw = request.headers.get(name);
    if (!raw) continue;
    const ip = raw.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return "unknown";
}

/**
 * @param {string} ip
 */
function ipToKeyPart(ip) {
  const safe = ip.replace(/[^a-zA-Z0-9]/g, "_");
  return safe || "unknown";
}

/**
 * @param {number} windowSec
 */
function windowId(windowSec) {
  return Math.floor(Date.now() / (windowSec * 1000));
}

/**
 * @param {number} windowSec
 * @param {number} id
 */
function retryAfterSec(windowSec, id) {
  const windowEndMs = (id + 1) * windowSec * 1000;
  return Math.max(1, Math.ceil((windowEndMs - Date.now()) / 1000));
}

/**
 * @param {number} sec
 */
function humanRetryMinutes(sec) {
  return Math.max(1, Math.ceil(sec / 60));
}

/**
 * @param {KvClient} kv
 * @param {string} key
 */
async function readCount(kv, key) {
  const raw = await kv.get(key);
  const count = raw == null ? 0 : Number(raw);
  if (!Number.isFinite(count) || count < 0) return 0;
  return count;
}

/**
 * @param {KvClient} kv
 * @param {string} key
 * @param {number} nextCount
 */
async function writeCount(kv, key, nextCount) {
  await kv.put(key, String(nextCount));
}

/**
 * @typedef {{ key: string, maxRequests: number, windowSec: number, scope: 'ip' | 'global' }} LimitRule
 */

/**
 * @param {KvClient} kv
 * @param {LimitRule} rule
 * @param {boolean} failOpen
 * @returns {Promise<{ ok: true, count: number } | { ok: false, retryAfterSec: number, message: string, code: string }>}
 */
async function inspectRule(kv, rule, failOpen) {
  try {
    const count = await readCount(kv, rule.key);
    if (count >= rule.maxRequests) {
      const retry = retryAfterSec(rule.windowSec, windowId(rule.windowSec));
      const minutes = humanRetryMinutes(retry);
      const message =
        rule.scope === "global"
          ? `当前使用人数较多，请约 ${minutes} 分钟后再试。`
          : `请求过于频繁，请约 ${minutes} 分钟后再试。`;
      const code =
        rule.scope === "global"
          ? "RATE_LIMIT_GLOBAL_EXCEEDED"
          : "RATE_LIMIT_IP_EXCEEDED";
      return { ok: false, retryAfterSec: retry, message, code };
    }
    return { ok: true, count };
  } catch (e) {
    console.error(`[rate-limit] KV get failed (${rule.scope})`, e);
    if (failOpen) return { ok: true, count: 0 };
    return {
      ok: false,
      retryAfterSec: rule.windowSec,
      message: "服务繁忙，请稍后再试。",
      code: "RATE_LIMIT_EXCEEDED",
    };
  }
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @returns {Promise<{ allowed: true } | { allowed: false, retryAfterSec: number, message: string, code: string }>}
 */
export async function checkRateLimit(request, env) {
  const config = getRateLimitConfig(env);
  if (!config.enabled) {
    return { allowed: true };
  }

  const kv = resolveRateLimitKv(env);
  if (!kv) {
    if (config.failOpen) {
      console.warn(
        `[rate-limit] KV binding "${config.bindingName}" not found; fail-open`,
      );
      return { allowed: true };
    }
    return {
      allowed: false,
      retryAfterSec: config.ip.windowSec || config.global.windowSec,
      message: "服务限流配置异常，请稍后再试。",
      code: "RATE_LIMIT_EXCEEDED",
    };
  }

  /** @type {LimitRule[]} */
  const rules = [];

  if (config.global.enabled) {
    const id = windowId(config.global.windowSec);
    rules.push({
      key: `${config.keyPrefix}_rl_global_${id}`,
      maxRequests: config.global.maxRequests,
      windowSec: config.global.windowSec,
      scope: "global",
    });
  }

  if (config.ip.enabled) {
    const ip = getClientIp(request);
    const id = windowId(config.ip.windowSec);
    rules.push({
      key: `${config.keyPrefix}_rl_${ipToKeyPart(ip)}_${id}`,
      maxRequests: config.ip.maxRequests,
      windowSec: config.ip.windowSec,
      scope: "ip",
    });
  }

  /** @type {{ rule: LimitRule, count: number }[]} */
  const passed = [];

  for (const rule of rules) {
    const result = await inspectRule(kv, rule, config.failOpen);
    if (!result.ok) {
      return {
        allowed: false,
        retryAfterSec: result.retryAfterSec,
        message: result.message,
        code: result.code,
      };
    }
    passed.push({ rule, count: result.count });
  }

  for (const { rule, count } of passed) {
    try {
      await writeCount(kv, rule.key, count + 1);
    } catch (e) {
      console.error(`[rate-limit] KV put failed (${rule.scope})`, e);
      if (!config.failOpen) {
        return {
          allowed: false,
          retryAfterSec: rule.windowSec,
          message: "服务繁忙，请稍后再试。",
          code: "RATE_LIMIT_EXCEEDED",
        };
      }
    }
  }

  return { allowed: true };
}
