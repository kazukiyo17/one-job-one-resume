import { useCallback, useEffect, useRef, useState } from "react";
import { postOptimize } from "./api/client";
import { InputView } from "./components/input/InputView";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { WorkspaceView } from "./components/workspace/WorkspaceView";
import { useDebouncedCallback } from "./hooks/useDebouncedCallback";
import { buildOptimizePayload } from "./lib/forms";
import { formatLimitHints, getLimits } from "./lib/limits";
import { normalizeResume, isValidResume } from "./lib/resume/normalize";
import type { EditableResult } from "./lib/resume/serialize";
import {
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from "./lib/session-form-draft";
import {
  clearSessionResults,
  loadSessionResults,
  saveSessionResults,
} from "./lib/session-results";

type StatusState =
  | { kind: "hidden" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string };

export default function App() {
  const limits = getLimits();
  const limitHints = formatLimitHints(limits);

  const [phase, setPhase] = useState<"input" | "workspace">("input");
  const [workspaceData, setWorkspaceData] = useState<EditableResult | null>(
    null,
  );

  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [hintDanger, setHintDanger] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>({ kind: "hidden" });

  const abortRef = useRef<AbortController | null>(null);
  const draftLoaded = useRef(false);

  const persistDraft = useDebouncedCallback(() => {
    void saveFormDraft({ resumeText, jobDesc, resumeFile, jdFile });
  }, 400);

  useEffect(() => {
    document.body.classList.toggle("app--workspace", phase === "workspace");
    return () => document.body.classList.remove("app--workspace");
  }, [phase]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    persistDraft();
  }, [resumeText, jobDesc, resumeFile, jdFile, persistDraft]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const draft = await loadFormDraft();
      if (cancelled) return;
      if (draft) {
        setResumeText(draft.resumeText);
        setJobDesc(draft.jobDesc);
        setResumeFile(draft.resumeFile);
        setJdFile(draft.jdFile);
      }
      draftLoaded.current = true;

      const saved = loadSessionResults();
      const restoredResume = saved?.resume
        ? normalizeResume(saved.resume as Record<string, unknown>)
        : null;
      if (
        saved &&
        (restoredResume ||
          saved.analysis?.trim() ||
          saved.suggestions?.trim())
      ) {
        if (restoredResume) {
          setWorkspaceData({
            resume: restoredResume,
            analysis: saved.analysis || "",
            suggestions: saved.suggestions || "",
          });
        }
        setStatus({ kind: "hidden" });
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const showReject = useCallback((msg: string) => {
    setHint(msg);
    setHintDanger(true);
  }, []);

  const handleReset = useCallback(() => {
    setResumeText("");
    setJobDesc("");
    setResumeFile(null);
    setJdFile(null);
    setHint("");
    setHintDanger(false);
    setStatus({ kind: "hidden" });
    setWorkspaceData(null);
    setPhase("input");
    clearSessionResults();
    void clearFormDraft();
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleBackToInput = useCallback(() => {
    setPhase("input");
    setStatus({ kind: "hidden" });
  }, []);

  const handleGoToCachedResult = useCallback(() => {
    if (workspaceData) {
      setPhase("workspace");
      return;
    }
    const saved = loadSessionResults();
    const restoredResume = saved?.resume
      ? normalizeResume(saved.resume as Record<string, unknown>)
      : null;
    if (!restoredResume) return;
    setWorkspaceData({
      resume: restoredResume,
      analysis: saved?.analysis || "",
      suggestions: saved?.suggestions || "",
    });
    setPhase("workspace");
  }, [workspaceData]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setHint("");
    setHintDanger(false);

    const built = buildOptimizePayload({
      resumeText,
      jobDesc,
      resumeFile,
      jdFile,
    });
    if (!built.ok) {
      setHint(built.message || "");
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus({
      kind: "loading",
      message:
        "AI 正在加班加点打磨简历，稍等片刻～（长文档可能要一两分钟）",
    });
    setSubmitting(true);

    try {
      const data = await postOptimize(built.formData, ctrl.signal);

      const resume = normalizeResume(
        (data.resume ?? {}) as Record<string, unknown>,
      );
      if (!resume || !isValidResume(resume)) {
        throw new Error(
          "接口未返回有效简历（需含 basic 与各板块条目字段），请检查 Dify 节点 3 Schema。",
        );
      }

      const editable: EditableResult = {
        resume,
        analysis: String(data.analysis || ""),
        suggestions: String(data.suggestions || ""),
      };
      setWorkspaceData(editable);
      setPhase("workspace");
      saveSessionResults({
        resume,
        analysis: editable.analysis,
        suggestions: editable.suggestions,
        activeTab: "html",
      });
      setStatus({ kind: "hidden" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setStatus({ kind: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const inWorkspace = phase === "workspace" && workspaceData;
  const hasCachedResult = Boolean(workspaceData?.resume);

  return (
    <>
      <SiteHeader minimal={Boolean(inWorkspace)} />
      <main className={"main" + (inWorkspace ? " main--workspace" : "")}>
        {inWorkspace ? (
          <WorkspaceView
            initial={workspaceData}
            onBack={handleBackToInput}
          />
        ) : (
          <InputView
            limits={limits}
            limitHints={limitHints}
            resumeText={resumeText}
            jobDesc={jobDesc}
            resumeFile={resumeFile}
            jdFile={jdFile}
            hint={hint}
            hintDanger={hintDanger}
            submitting={submitting}
            hasCachedResult={hasCachedResult}
            statusMessage={
              status.kind !== "hidden" ? status.message : null
            }
            statusKind={status.kind}
            onResumeTextChange={setResumeText}
            onJobDescChange={setJobDesc}
            onResumeFileChange={setResumeFile}
            onJdFileChange={setJdFile}
            onReject={showReject}
            onSubmit={(e) => void handleSubmit(e)}
            onReset={handleReset}
            onGoToCachedResult={handleGoToCachedResult}
          />
        )}
      </main>
      {!inWorkspace && <SiteFooter />}
    </>
  );
}
