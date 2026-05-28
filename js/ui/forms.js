import { getLimits, validateOptimizePayload } from "../limits.js";

/**
 * @param {HTMLFormElement} form
 * @returns {{ ok: boolean, message?: string, formData: FormData }}
 */
export function buildOptimizePayload(form) {
  const fd = new FormData(form);
  const resumeFile = fd.get("resume_file");
  const jdFile = fd.get("jd_file");
  const resumeText = String(fd.get("resume_str") || "").trim();
  const jdText = String(fd.get("job_desc") || "").trim();

  const hasResumeFile =
    resumeFile instanceof File && resumeFile.size > 0;
  const hasJdFile = jdFile instanceof File && jdFile.size > 0;
  const hasResume = hasResumeFile || resumeText.length > 0;
  const hasJd = hasJdFile || jdText.length > 0;

  if (!hasResume) {
    return { ok: false, message: "请至少提供一种个人简历（文件或文本）。", formData: fd };
  }
  if (!hasJd) {
    return { ok: false, message: "请至少提供一种岗位 JD（文件或文本）。", formData: fd };
  }

  const limits = getLimits();
  const limitError = validateOptimizePayload(
    {
      resumeText,
      jdText,
      resumeFile: hasResumeFile ? resumeFile : null,
      jdFile: hasJdFile ? jdFile : null,
    },
    limits,
  );
  if (limitError) {
    return { ok: false, message: limitError.message, formData: fd };
  }

  const out = new FormData();
  if (hasResumeFile) out.append("resume_file", resumeFile);
  if (resumeText) out.append("resume_str", resumeText);
  if (hasJdFile) out.append("jd_file", jdFile);
  if (jdText) out.append("job_desc", jdText);

  return { ok: true, formData: out };
}
