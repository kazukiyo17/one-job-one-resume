import { getOptimizeUrl, getConfig } from "../config.js";
import { getMockOptimizeResponse } from "./mock-optimize.js";

/**
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function sleep(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * @param {FormData} formData
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ matchScore?: number, optimizedText?: string, html?: string, analysis?: string, suggestions?: string, modificationPoints?: string }>}
 */
export async function postOptimize(formData, signal) {
  const { timeoutMs, mockOptimize, mockDelayMs } = getConfig();

  if (mockOptimize) {
    try {
      await sleep(mockDelayMs, signal);
    } catch (e) {
      if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
        throw new Error("请求超时或已取消，请稍后重试。");
      }
      throw e;
    }
    return getMockOptimizeResponse();
  }

  const url = getOptimizeUrl();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    if (e.name === "AbortError") {
      throw new Error("请求超时或已取消，请稍后重试。");
    }
    throw new Error("网络异常，请检查网络或 API 地址配置。");
  }
  clearTimeout(t);

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* 非 JSON */
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `请求失败（${res.status}）`;
    throw new Error(msg);
  }

  return data || {};
}
