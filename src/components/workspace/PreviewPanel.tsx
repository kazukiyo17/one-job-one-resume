import { MarkdownBody } from "../MarkdownBody";
import { ResumePreview } from "../ResumePreview";

export type PreviewTab = "resume" | "analysis" | "tips";

const TABS: { id: PreviewTab; label: string }[] = [
  { id: "resume", label: "简历预览" },
  { id: "analysis", label: "简历分析" },
  { id: "tips", label: "提升建议" },
];

type PreviewPanelProps = {
  activeTab: PreviewTab;
  resumeHtml: string;
  analysis: string;
  suggestions: string;
  onTabChange: (tab: PreviewTab) => void;
  onOpenResumeTab: () => void;
};

export function PreviewPanel({
  activeTab,
  resumeHtml,
  analysis,
  suggestions,
  onTabChange,
  onOpenResumeTab,
}: PreviewPanelProps) {
  return (
    <section className="preview-panel" aria-label="结果预览">
      <div className="preview-panel__head">
        <div className="segmented" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={
                "segmented__btn" +
                (activeTab === tab.id ? " segmented__btn--active" : "")
              }
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="preview-panel__body">
        {activeTab === "resume" && (
          <div className="preview-panel__resume" role="tabpanel">
            <ResumePreview html={resumeHtml} onOpenInNewTab={onOpenResumeTab} />
          </div>
        )}
        {activeTab === "analysis" && (
          <div className="preview-panel__md" role="tabpanel">
            <MarkdownBody source={analysis} />
          </div>
        )}
        {activeTab === "tips" && (
          <div className="preview-panel__md" role="tabpanel">
            <MarkdownBody source={suggestions} />
          </div>
        )}
      </div>
    </section>
  );
}
