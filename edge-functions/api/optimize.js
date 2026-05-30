/**
 * Edge Functions · 对外 /api/optimize 入口
 *
 * - KV 限流（EdgeOne Pages KV 仅支持 Edge Functions）
 * - 通过后转发至 Node Cloud Function：/api/node/optimize
 *
 * Dify 工作流仍在 Node 侧执行（更长 CPU 时间与更大请求体）。
 */

import { checkRateLimit, rateLimitResponse } from "../lib/rate-limit.js";

/** Node Cloud Function 内部路由，不对外文档化 */
const NODE_OPTIMIZE_PATH = "/api/node/optimize";

/**
 * @param {Record<string, string | undefined>} env
 */
function corsHeaders(env) {
  const origin = env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.env),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const rate = await checkRateLimit({ request, env });
  if (!rate.allowed) {
    return rateLimitResponse(rate, env);
  }

  const nodeUrl = new URL(request.url);
  nodeUrl.pathname = NODE_OPTIMIZE_PATH;

  const nodeRequest = new Request(nodeUrl.toString(), request);
  return fetch(nodeRequest);
}
