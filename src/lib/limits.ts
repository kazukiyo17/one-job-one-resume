import { getLimitsEnv } from "../config";

export type PayloadLimits = {
  maxFileBytes: number;
  maxResumeText: number;
  maxJdText: number;
  maxRequestBytes: number;
};

const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_RESUME_TEXT = 2800;
const DEFAULT_MAX_JD_TEXT = 1000;
const DEFAULT_MAX_REQUEST_BYTES = 12 * 1024 * 1024;

function parsePositiveInt(value: unknown, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n =
    typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveLimits(source: Record<string, unknown>): PayloadLimits {
  return {
    maxFileBytes: parsePositiveInt(
      source.MAX_FILE_BYTES,
      DEFAULT_MAX_FILE_BYTES,
    ),
    maxResumeText: parsePositiveInt(
      source.MAX_RESUME_TEXT_CHARS,
      DEFAULT_MAX_RESUME_TEXT,
    ),
    maxJdText: parsePositiveInt(source.MAX_JD_TEXT_CHARS, DEFAULT_MAX_JD_TEXT),
    maxRequestBytes: parsePositiveInt(
      source.MAX_REQUEST_BYTES,
      DEFAULT_MAX_REQUEST_BYTES,
    ),
  };
}

export function getLimits(): PayloadLimits {
  return resolveLimits(getLimitsEnv() as Record<string, unknown>);
}

export function formatFileLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb % 1 === 0 ? `${mb}MB` : `${mb.toFixed(1)}MB`;
}

export function formatCharCount(current: number, max: number): string {
  return `${current.toLocaleString()} / ${max.toLocaleString()} 字`;
}

export function formatLimitHints(limits: PayloadLimits) {
  return {
    file: `单文件 ≤ ${formatFileLimit(limits.maxFileBytes)}`,
    resumeText: `简历文本 ≤ ${limits.maxResumeText.toLocaleString()} 字`,
    jdText: `JD 文本 ≤ ${limits.maxJdText.toLocaleString()} 字`,
  };
}

export function validateOptimizePayload(
  payload: {
    resumeText: string;
    jdText: string;
    resumeFile: File | null;
    jdFile: File | null;
  },
  limits: PayloadLimits,
): { code: string; message: string; status: number } | null {
  const { resumeText, jdText, resumeFile, jdFile } = payload;

  if (resumeText.length > limits.maxResumeText) {
    return {
      code: "RESUME_TEXT_TOO_LONG",
      message: `简历文本不超过 ${limits.maxResumeText.toLocaleString()} 字（当前 ${resumeText.length.toLocaleString()} 字）。`,
      status: 422,
    };
  }
  if (jdText.length > limits.maxJdText) {
    return {
      code: "JD_TEXT_TOO_LONG",
      message: `JD 文本不超过 ${limits.maxJdText.toLocaleString()} 字（当前 ${jdText.length.toLocaleString()} 字）。`,
      status: 422,
    };
  }
  if (resumeFile && resumeFile.size > limits.maxFileBytes) {
    return {
      code: "RESUME_FILE_TOO_LARGE",
      message: `简历文件不超过 ${formatFileLimit(limits.maxFileBytes)}。`,
      status: 413,
    };
  }
  if (jdFile && jdFile.size > limits.maxFileBytes) {
    return {
      code: "JD_FILE_TOO_LARGE",
      message: `JD 文件不超过 ${formatFileLimit(limits.maxFileBytes)}。`,
      status: 413,
    };
  }

  const total =
    resumeText.length +
    jdText.length +
    (resumeFile?.size ?? 0) +
    (jdFile?.size ?? 0);
  if (total > limits.maxRequestBytes) {
    return {
      code: "PAYLOAD_TOO_LARGE",
      message: "本次提交内容过大，请缩小文件或精简文本后重试。",
      status: 413,
    };
  }

  return null;
}
