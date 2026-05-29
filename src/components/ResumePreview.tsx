type ResumePreviewProps = {
  html: string;
  onOpenInNewTab: () => void;
};

export function ResumePreview({ html, onOpenInNewTab }: ResumePreviewProps) {
  return (
    <div className="preview-wrap">
      <iframe
        id="preview-frame"
        title="优化简历预览"
        sandbox=""
        srcDoc={html.trim() || undefined}
      />
      <button
        type="button"
        className="btn btn--ghost btn--small btn-preview-float"
        onClick={onOpenInNewTab}
      >
        在新标签页打开
      </button>
    </div>
  );
}
