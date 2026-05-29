import { getConfig, getOptimizeUrl } from "../config";
import { getMockOptimizeResponse } from "./mock-optimize";

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

export type OptimizeResponse = {
  resume?: Record<string, unknown>;
  analysis?: string;
  suggestions?: string;
  meta?: { requestId?: string };
};

export async function postOptimize(
  formData: FormData,
  signal?: AbortSignal,
): Promise<OptimizeResponse> {
  const { timeoutMs, mockOptimize, mockDelayMs } = getConfig();

  if (mockOptimize) {
    try {
      await sleep(mockDelayMs, signal);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
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

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("请求超时或已取消，请稍后重试。");
    }
    throw new Error("网络异常，请检查网络或 API 地址配置。");
  }
  clearTimeout(t);

  const text = await res.text();
  let data: OptimizeResponse & { error?: { message?: string }; message?: string } | null =
    null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }

  if (!res.ok) {
    const msg =
      data?.error?.message || data?.message || `请求失败（${res.status}）`;
    throw new Error(msg);
  }

  return data || {};
}
