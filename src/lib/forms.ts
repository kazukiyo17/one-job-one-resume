import { getLimits, validateOptimizePayload } from "./limits";

export type FormInput = {
  resumeText: string;
  jobDesc: string;
  resumeFile: File | null;
  jdFile: File | null;
};

export function buildOptimizePayload(input: FormInput): {
  ok: boolean;
  message?: string;
  formData: FormData;
} {
  const resumeText = input.resumeText.trim();
  const jdText = input.jobDesc.trim();
  const resumeFile = input.resumeFile;
  const jdFile = input.jdFile;

  const hasResumeFile = Boolean(resumeFile && resumeFile.size > 0);
  const hasJdFile = Boolean(jdFile && jdFile.size > 0);
  const hasResume = hasResumeFile || resumeText.length > 0;
  const hasJd = hasJdFile || jdText.length > 0;

  const emptyFd = new FormData();

  if (!hasResume) {
    return {
      ok: false,
      message: "请至少提供一种个人简历（文件或文本）。",
      formData: emptyFd,
    };
  }
  if (!hasJd) {
    return {
      ok: false,
      message: "请至少提供一种岗位 JD（文件或文本）。",
      formData: emptyFd,
    };
  }

  const limits = getLimits();
  const limitError = validateOptimizePayload(
    { resumeText, jdText, resumeFile: hasResumeFile ? resumeFile : null, jdFile: hasJdFile ? jdFile : null },
    limits,
  );
  if (limitError) {
    return { ok: false, message: limitError.message, formData: emptyFd };
  }

  const out = new FormData();
  if (hasResumeFile && resumeFile) out.append("resume_file", resumeFile);
  if (resumeText) out.append("resume_str", resumeText);
  if (hasJdFile && jdFile) out.append("jd_file", jdFile);
  if (jdText) out.append("job_desc", jdText);

  return { ok: true, formData: out };
}
