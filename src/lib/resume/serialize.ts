import type { ResumeData } from "./types";

/** 用于编辑区的完整 API 结果 JSON（含分析与建议） */
export type EditableResult = {
  resume: ResumeData;
  analysis: string;
  suggestions: string;
};

export function toEditableJson(data: EditableResult): string {
  return JSON.stringify(data, null, 2);
}

export function parseEditableJson(
  raw: string,
): { ok: true; data: EditableResult } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: "JSON 须为对象。" };
    }
    const resume = parsed.resume;
    if (!resume || typeof resume !== "object" || Array.isArray(resume)) {
      return { ok: false, message: "缺少 resume 对象。" };
    }
    return {
      ok: true,
      data: {
        resume: resume as ResumeData,
        analysis: String(parsed.analysis ?? ""),
        suggestions: String(parsed.suggestions ?? ""),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "无法解析 JSON";
    return { ok: false, message: msg };
  }
}
