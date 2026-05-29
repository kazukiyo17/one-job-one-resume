import { Dropzone } from "../Dropzone";
import { Hero } from "../Hero";
import type { PayloadLimits } from "../../lib/limits";

type InputViewProps = {
  limits: PayloadLimits;
  limitHints: { file: string };
  resumeText: string;
  jobDesc: string;
  resumeFile: File | null;
  jdFile: File | null;
  hint: string;
  hintDanger: boolean;
  submitting: boolean;
  hasCachedResult: boolean;
  statusMessage: string | null;
  statusKind: "hidden" | "loading" | "error";
  onResumeTextChange: (v: string) => void;
  onJobDescChange: (v: string) => void;
  onResumeFileChange: (f: File | null) => void;
  onJdFileChange: (f: File | null) => void;
  onReject: (msg: string) => void;
  onSubmit: (ev: React.FormEvent) => void;
  onReset: () => void;
  onGoToCachedResult: () => void;
};

export function InputView({
  limits,
  limitHints,
  resumeText,
  jobDesc,
  resumeFile,
  jdFile,
  hint,
  hintDanger,
  submitting,
  hasCachedResult,
  statusMessage,
  statusKind,
  onResumeTextChange,
  onJobDescChange,
  onResumeFileChange,
  onJdFileChange,
  onReject,
  onSubmit,
  onReset,
  onGoToCachedResult,
}: InputViewProps) {
  const statusClass =
    statusKind === "hidden"
      ? "panel-status panel-status--hidden"
      : statusKind === "loading"
        ? "panel-status panel-status--loading"
        : "panel-status panel-status--error";

  return (
    <>
      <Hero />

      <div
        className={statusClass}
        aria-live="polite"
        hidden={statusKind === "hidden"}
      >
        {statusKind === "loading" && (
          <span className="panel-status__dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
        {statusMessage}
      </div>

      <form
        className="card form-card"
        noValidate
        onSubmit={onSubmit}
        onReset={onReset}
      >
        <div className="form-grid">
          <Dropzone
            label="个人简历"
            titleId="fg-resume-title"
            textareaId="resume-text"
            charCountId="resume-char-count"
            text={resumeText}
            file={resumeFile}
            maxText={limits.maxResumeText}
            limits={limits}
            placeholder="简历贴到这里~"
            fileHint={`支持 PDF、Word，${limitHints.file}`}
            onTextChange={onResumeTextChange}
            onFileChange={onResumeFileChange}
            onReject={onReject}
          />
          <Dropzone
            label="目标岗位 JD"
            titleId="fg-jd-title"
            textareaId="jd-text"
            charCountId="jd-char-count"
            text={jobDesc}
            file={jdFile}
            maxText={limits.maxJdText}
            limits={limits}
            placeholder="JD 丢到这里~"
            fileHint={`支持 PDF、Word，${limitHints.file}`}
            onTextChange={onJobDescChange}
            onFileChange={onJdFileChange}
            onReject={onReject}
          />
        </div>

        <p
          id="form-hint"
          className="form-hint"
          role="status"
          style={hintDanger ? { color: "var(--danger)" } : undefined}
        >
          {hint}
        </p>
        <p className="hero__privacy" role="note">
          <strong>隐私说明：</strong>
          本站不会在服务器存储你的个人信息、简历或 JD；生成结果也不会替你存档。
          <strong>请在生成后尽快自行保存</strong>。
        </p>
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? "优化中…" : "开跑优化"}
          </button>
          <button type="reset" className="btn btn--ghost">
            清空
          </button>
          {hasCachedResult && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onGoToCachedResult}
            >
              查看上次结果
            </button>
          )}
        </div>
      </form>
    </>
  );
}
