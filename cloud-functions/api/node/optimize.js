/**
 * Pages Functions · Cloud Functions（Node.js）
 * 内部路由：POST /api/node/optimize（由 edge-functions/api/optimize.js 转发）
 *
 * Dify 工作流在此执行：Edge Functions CPU/请求体限制不适合多轮 LLM。
 */

const JSON_HEADERS = { "Content-Type": "application/json; charset=UTF-8" };

function corsHeaders(env) {
  const origin = env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonBody(status, payload, env, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(env), ...extraHeaders },
  });
}

/** @param {unknown} r */
function safeJsonParse(r) {
  if (typeof r !== "string") return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} file
 * @returns {file is Blob}
 */
function isNonEmptyBlob(file) {
  return (
    file != null &&
    typeof file === "object" &&
    typeof (/** @type {Blob} */ (file)).size === "number" &&
    (/** @type {Blob} */ (file)).size > 0 &&
    typeof (/** @type {Blob} */ (file)).arrayBuffer === "function"
  );
}

const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_RESUME_TEXT = 2800;
const DEFAULT_MAX_JD_TEXT = 1000;
const DEFAULT_MAX_REQUEST_BYTES = 12 * 1024 * 1024;

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const n =
    typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @param {Record<string, string | undefined>} env
 */
function getPayloadLimits(env) {
  return {
    maxFileBytes: parsePositiveInt(env.MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES),
    maxResumeText: parsePositiveInt(
      env.MAX_RESUME_TEXT_CHARS,
      DEFAULT_MAX_RESUME_TEXT,
    ),
    maxJdText: parsePositiveInt(env.MAX_JD_TEXT_CHARS, DEFAULT_MAX_JD_TEXT),
    maxRequestBytes: parsePositiveInt(
      env.MAX_REQUEST_BYTES,
      DEFAULT_MAX_REQUEST_BYTES,
    ),
  };
}

/**
 * @param {number} bytes
 */
function formatFileLimit(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb % 1 === 0 ? `${mb}MB` : `${mb.toFixed(1)}MB`;
}

/**
 * @param {{
 *   resumeText: string,
 *   jdText: string,
 *   resumeFile: unknown,
 *   jdFile: unknown,
 * }} payload
 * @param {ReturnType<typeof getPayloadLimits>} limits
 */
function validatePayload(payload, limits) {
  const { resumeText, jdText, resumeFile, jdFile } = payload;

  if (resumeText.length > limits.maxResumeText) {
    return {
      code: "RESUME_TEXT_TOO_LONG",
      message: `简历文本不超过 ${limits.maxResumeText} 字（当前 ${resumeText.length} 字）。`,
      status: 422,
    };
  }
  if (jdText.length > limits.maxJdText) {
    return {
      code: "JD_TEXT_TOO_LONG",
      message: `JD 文本不超过 ${limits.maxJdText} 字（当前 ${jdText.length} 字）。`,
      status: 422,
    };
  }
  if (isNonEmptyBlob(resumeFile) && resumeFile.size > limits.maxFileBytes) {
    return {
      code: "RESUME_FILE_TOO_LARGE",
      message: `简历文件不超过 ${formatFileLimit(limits.maxFileBytes)}。`,
      status: 413,
    };
  }
  if (isNonEmptyBlob(jdFile) && jdFile.size > limits.maxFileBytes) {
    return {
      code: "JD_FILE_TOO_LARGE",
      message: `JD 文件不超过 ${formatFileLimit(limits.maxFileBytes)}。`,
      status: 413,
    };
  }

  const total =
    resumeText.length +
    jdText.length +
    (isNonEmptyBlob(resumeFile) ? resumeFile.size : 0) +
    (isNonEmptyBlob(jdFile) ? jdFile.size : 0);
  if (total > limits.maxRequestBytes) {
    return {
      code: "PAYLOAD_TOO_LARGE",
      message: "本次提交内容过大，请缩小文件或精简文本后重试。",
      status: 413,
    };
  }

  return null;
}

/**
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {Blob} file
 * @param {string} user
 * @param {string} [filename]
 */
async function difyUploadFile(baseUrl, apiKey, file, user, filename) {
  const fd = new FormData();
  const name =
    filename ||
    (typeof File !== "undefined" && file instanceof File && file.name) ||
    "document.bin";
  fd.append("file", file, name);
  fd.append("user", user);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });

  const raw = await res.text();
  const data = safeJsonParse(raw) ?? {};

  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      data.detail ||
      raw.slice(0, 200) ||
      `files/upload ${res.status}`;
    throw new Error(msg);
  }

  const id = data.id;
  if (!id) throw new Error("Dify 上传未返回文件 id");
  return id;
}

/**
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {Record<string, unknown>} inputs
 * @param {string} user
 */
async function difyRunWorkflow(baseUrl, apiKey, inputs, user) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs,
      response_mode: "blocking",
      user,
    }),
  });

  const raw = await res.text();
  const parsed = safeJsonParse(raw);

  if (!res.ok) {
    const msg =
      parsed?.message ||
      parsed?.error ||
      parsed?.detail ||
      raw.slice(0, 400) ||
      `workflows/run ${res.status}`;
    const err = new Error(msg);
    err.status = res.status >= 500 ? 502 : res.status === 429 ? 429 : 422;
    throw err;
  }

  return parsed ?? {};
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
function parseResumeObject(raw) {
  if (raw == null) return null;
  let obj = null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    obj = /** @type {Record<string, unknown>} */ (raw);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        obj = /** @type {Record<string, unknown>} */ (parsed);
      }
    } catch {
      return null;
    }
  }
  if (!obj) return null;
  return normalizeResume(obj);
}

/** @param {unknown} v */
function str(v) {
  return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string[]} keys
 */
function pickFields(obj, keys) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const k of keys) out[k] = str(obj[k]);
  return out;
}

/** @param {Record<string, string>} item */
function hasEntryContent(item) {
  return Object.values(item).some((v) => v.length > 0);
}

/**
 * @param {unknown} v
 * @param {string[]} keys
 * @param {Record<string, string>} [fallback]
 */
function normalizeEntryList(v, keys, fallback = {}) {
  if (Array.isArray(v)) {
    return v
      .filter((x) => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => pickFields(/** @type {Record<string, unknown>} */ (x), keys))
      .filter(hasEntryContent);
  }
  const text = str(v);
  if (!text) return [];
  return [{ ...fallback, [keys[keys.length - 1]]: text }];
}

/** @param {Record<string, unknown>} raw */
function normalizeBasic(raw) {
  const legacyBasic =
    raw.basic && typeof raw.basic === "object" && !Array.isArray(raw.basic)
      ? /** @type {Record<string, unknown>} */ (raw.basic)
      : null;
  const profile =
    raw.profile && typeof raw.profile === "object" && !Array.isArray(raw.profile)
      ? /** @type {Record<string, unknown>} */ (raw.profile)
      : null;
  const pick = (key) =>
    str(legacyBasic?.[key] ?? profile?.[key] ?? raw[key]);
  return {
    name: pick("name"),
    title: pick("title"),
    email: pick("email"),
    phone: pick("phone"),
    location: pick("location"),
    summary: pick("summary"),
  };
}

/** @param {Record<string, unknown>} raw */
function normalizeResume(raw) {
  const basic = normalizeBasic(raw);
  let experience = normalizeEntryList(raw.experience, [
    "company",
    "role",
    "period",
    "description",
  ]);
  let education = normalizeEntryList(raw.education, [
    "school",
    "degree",
    "period",
    "description",
  ]);
  let projects = normalizeEntryList(raw.projects, [
    "name",
    "role",
    "period",
    "description",
  ]);
  let activities = normalizeEntryList(raw.activities, [
    "name",
    "role",
    "period",
    "description",
  ]);
  let skills = [];
  if (Array.isArray(raw.skills)) {
    skills = raw.skills
      .filter((x) => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => {
        const o = /** @type {Record<string, unknown>} */ (x);
        return { category: str(o.category), items: str(o.items) };
      })
      .filter((s) => s.category || s.items);
  } else {
    const text = str(raw.skills);
    if (text) skills = [{ category: "", items: text }];
  }
  const legacyContent = str(raw.content) || str(raw.body);
  if (legacyContent && experience.length === 0) {
    experience = [
      { company: "", role: "", period: "", description: legacyContent },
    ];
  }
  if (!basic.name && !basic.title) return null;
  return { basic, experience, education, projects, activities, skills };
}

/** @param {Record<string, unknown>} resume */
function isValidResume(resume) {
  const basic =
    resume.basic && typeof resume.basic === "object"
      ? /** @type {Record<string, unknown>} */ (resume.basic)
      : null;
  if (!basic || !str(basic.name) || !str(basic.title)) return false;
  for (const key of [
    "experience",
    "education",
    "projects",
    "activities",
    "skills",
  ]) {
    const list = resume[key];
    if (Array.isArray(list) && list.length > 0) return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} outputs
 * @param {string} key
 */
function pickText(outputs, key) {
  const v = outputs[key];
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Workflow outputs: resume_json, analyse, suggestions only.
 * @param {Record<string, unknown>} outputs
 * @param {Record<string, string | undefined>} env
 */
function mapOutputs(outputs, env) {
  const kResume = env.DIFY_OUTPUT_RESUME || "resume_json";
  const kTips = env.DIFY_OUTPUT_SUGGESTIONS || "suggestions";
  const kAnalysis = env.DIFY_OUTPUT_ANALYSIS || "analyse";

  const resume = parseResumeObject(outputs[kResume]);

  return {
    resume,
    suggestions: pickText(outputs, kTips),
    analysis: pickText(outputs, kAnalysis),
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

  const apiKey = env.DIFY_API_KEY;
  const baseUrl = (env.DIFY_API_URL || "https://api.dify.ai").replace(/\/$/, "");

  if (!apiKey) {
    return jsonBody(
      500,
      {
        error: {
          code: "MISSING_DIFY_API_KEY",
          message: "服务端未配置 DIFY_API_KEY，请在 Pages 环境变量中设置。",
        },
      },
      env,
    );
  }

  const limits = getPayloadLimits(env);
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (Number.isFinite(len) && len > limits.maxRequestBytes) {
      return jsonBody(
        413,
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "本次提交内容过大，请缩小文件或精简文本后重试。",
          },
        },
        env,
      );
    }
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonBody(
      400,
      { error: { code: "BAD_MULTIPART", message: "无法解析表单数据。" } },
      env,
    );
  }

  const resumeText = String(form.get("resume_str") || "").trim();
  const jdText = String(form.get("job_desc") || "").trim();
  const resumeFile = form.get("resume_file");
  const jdFile = form.get("jd_file");

  const hasResume = resumeText.length > 0 || isNonEmptyBlob(resumeFile);
  const hasJd = jdText.length > 0 || isNonEmptyBlob(jdFile);

  if (!hasResume) {
    return jsonBody(
      422,
      {
        error: {
          code: "MISSING_RESUME",
          message: "请至少提供简历文件或简历文本。",
        },
      },
      env,
    );
  }
  if (!hasJd) {
    return jsonBody(
      422,
      {
        error: {
          code: "MISSING_JD",
          message: "请至少提供 JD 文件或 JD 文本。",
        },
      },
      env,
    );
  }

  const limitError = validatePayload(
    { resumeText, jdText, resumeFile, jdFile },
    limits,
  );
  if (limitError) {
    return jsonBody(
      limitError.status,
      {
        error: {
          code: limitError.code,
          message: limitError.message,
        },
      },
      env,
    );
  }

  const user =
    request.headers.get("x-user-id")?.trim() ||
    env.DIFY_DEFAULT_USER ||
    "resume-promote-web";

  const ikText = env.DIFY_INPUT_RESUME_TEXT || "resume_str";
  const ikJd = env.DIFY_INPUT_JD_TEXT || "job_desc";
  const ikResumeFile = env.DIFY_INPUT_RESUME_FILE || "resume_file";
  const ikJdFile = env.DIFY_INPUT_JD_FILE || "jd_file";

  /** @type {Record<string, unknown>} */
  const inputs = {};

  if (resumeText) inputs[ikText] = resumeText;
  if (jdText) inputs[ikJd] = jdText;

  try {
    if (isNonEmptyBlob(resumeFile)) {
      const id = await difyUploadFile(
        baseUrl,
        apiKey,
        /** @type {Blob} */ (resumeFile),
        user,
        typeof File !== "undefined" &&
          resumeFile instanceof File &&
          resumeFile.name
          ? resumeFile.name
          : undefined,
      );
      inputs[ikResumeFile] = {
        transfer_method: "local_file",
        upload_file_id: id,
        type: "document",
      };
    }
    if (isNonEmptyBlob(jdFile)) {
      const id = await difyUploadFile(
        baseUrl,
        apiKey,
        /** @type {Blob} */ (jdFile),
        user,
        typeof File !== "undefined" && jdFile instanceof File && jdFile.name
          ? jdFile.name
          : undefined,
      );
      inputs[ikJdFile] = {
        transfer_method: "local_file",
        upload_file_id: id,
        type: "document",
      };
    }

    const wf = await difyRunWorkflow(baseUrl, apiKey, inputs, user);
    console.log("[optimize] Dify workflow raw:", JSON.stringify(wf, null, 2));

    const dataBlock = wf.data ?? wf;
    const status = dataBlock.status ?? wf.status;
    if (status && status !== "succeeded") {
      const errMsg =
        dataBlock.error ||
        wf.error ||
        (typeof dataBlock.outputs === "object" &&
          dataBlock.outputs?.error) ||
        `工作流未成功：${status}`;
      return jsonBody(
        502,
        { error: { code: "WORKFLOW_FAILED", message: String(errMsg) } },
        env,
      );
    }

    const outputs =
      (typeof dataBlock.outputs === "object" && dataBlock.outputs) ||
      (typeof wf.outputs === "object" && wf.outputs) ||
      {};
    console.log("[optimize] Dify workflow outputs:", JSON.stringify(outputs, null, 2));

    const mapped = mapOutputs(outputs, env);
    console.log(
      "[optimize] mapped response:",
      JSON.stringify(
        {
          resume: mapped.resume,
          analysis: mapped.analysis,
          suggestions: mapped.suggestions,
        },
        null,
        2,
      ),
    );
    if (!mapped.resume || !isValidResume(mapped.resume)) {
      return jsonBody(
        502,
        {
          error: {
            code: "INVALID_RESUME_JSON",
            message:
              "工作流 resume_json 须含 basic.name、basic.title，且 experience/education/projects/activities/skills 至少一项为非空数组。",
          },
        },
        env,
      );
    }
    const requestId =
      wf.workflow_run_id ||
      dataBlock.id ||
      wf.task_id ||
      context.server?.requestId ||
      "";

    return jsonBody(
      200,
      {
        ...mapped,
        meta: { requestId },
      },
      env,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = e && typeof e === "object" && "status" in e ? e.status : 502;
    const httpStatus = typeof status === "number" ? status : 502;
    return jsonBody(
      httpStatus,
      { error: { code: "UPSTREAM_ERROR", message: msg } },
      env,
    );
  }
}
