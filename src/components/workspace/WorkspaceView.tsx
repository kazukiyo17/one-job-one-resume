import { useMemo, useState } from "react";
import { openHtmlInNewTab } from "../../lib/open-html-tab";
import { normalizeResume, isValidResume } from "../../lib/resume/normalize";
import { resumeToHtml } from "../../lib/resume/resume-to-html";
import type { EditableResult } from "../../lib/resume/serialize";
import { saveSessionResults } from "../../lib/session-results";
import { PreviewPanel, type PreviewTab } from "./PreviewPanel";
import { ResumeStructuredEditor } from "./editor/ResumeStructuredEditor";

type WorkspaceViewProps = {
  initial: EditableResult;
  onBack: () => void;
};

export function WorkspaceView({ initial, onBack }: WorkspaceViewProps) {
  const [data, setData] = useState<EditableResult>(initial);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("resume");
  const { resumeHtml, previewError: resumePreviewError } = useMemo(() => {
    const normalized = normalizeResume(
      data.resume as Record<string, unknown>,
    );
    if (!normalized || !isValidResume(normalized)) {
      return {
        resumeHtml: "",
        previewError:
          "resume 结构无效：需含 basic.name、basic.title 及至少一个板块条目。",
      };
    }
    return { resumeHtml: resumeToHtml(normalized), previewError: null };
  }, [data.resume]);

  function handleDataChange(next: EditableResult) {
    setData(next);
    const normalized = normalizeResume(
      next.resume as Record<string, unknown>,
    );
    saveSessionResults({
      resume: normalized ?? next.resume,
      analysis: next.analysis,
      suggestions: next.suggestions,
      activeTab:
        previewTab === "analysis"
          ? "analysis"
          : previewTab === "tips"
            ? "tips"
            : "html",
    });
  }

  function handleOpenResumeTab() {
    if (!resumeHtml.trim()) return;
    openHtmlInNewTab(resumeHtml);
  }

  function handlePreviewTab(tab: PreviewTab) {
    setPreviewTab(tab);
    saveSessionResults({
      resume: data.resume,
      analysis: data.analysis,
      suggestions: data.suggestions,
      activeTab:
        tab === "analysis" ? "analysis" : tab === "tips" ? "tips" : "html",
    });
  }

  return (
    <div className="workspace">
      <div className="workspace__toolbar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← 重新优化
        </button>
        <span className="workspace__toolbar-title">简历工作台</span>
        <div className="workspace__toolbar-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleOpenResumeTab}
            disabled={!resumeHtml.trim()}
          >
            新标签页打开
          </button>
        </div>
      </div>

      <div className="workspace__split">
        <div className="workspace__preview-col">
          {resumePreviewError && previewTab === "resume" && (
            <p className="workspace__preview-warn" role="status">
              {resumePreviewError}
            </p>
          )}
          <PreviewPanel
            activeTab={previewTab}
            resumeHtml={resumeHtml}
            analysis={data.analysis}
            suggestions={data.suggestions}
            onTabChange={handlePreviewTab}
            onOpenResumeTab={handleOpenResumeTab}
          />
        </div>
        <aside className="workspace__editor-col" aria-label="编辑简历内容">
          <ResumeStructuredEditor data={data} onChange={handleDataChange} />
        </aside>
      </div>
    </div>
  );
}
