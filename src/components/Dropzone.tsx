import { useId, useRef, type DragEvent } from "react";
import { formatCharCount, formatFileLimit } from "../lib/limits";
import type { PayloadLimits } from "../lib/limits";

const FILE_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type DropzoneProps = {
  label: string;
  titleId: string;
  textareaId: string;
  charCountId: string;
  text: string;
  file: File | null;
  maxText: number;
  limits: PayloadLimits;
  placeholder: string;
  fileHint: string;
  onTextChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onReject: (message: string) => void;
};

export function Dropzone({
  label,
  titleId,
  textareaId,
  charCountId,
  text,
  file,
  maxText,
  limits,
  placeholder,
  fileHint,
  onTextChange,
  onFileChange,
  onReject,
}: DropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const len = text.length;
  const charHint = formatCharCount(len, maxText);
  const charClass =
    len >= maxText
      ? "dropzone__hint dropzone__hint--secondary is-over"
      : len >= Math.floor(maxText * 0.9)
        ? "dropzone__hint dropzone__hint--secondary is-warn"
        : "dropzone__hint dropzone__hint--secondary";

  function trySetFile(f: File | undefined) {
    if (!f || f.size === 0) return;
    if (f.size > limits.maxFileBytes) {
      onReject(
        `文件过大，请选择不超过 ${formatFileLimit(limits.maxFileBytes)} 的文件。`,
      );
      return;
    }
    onFileChange(f);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    e.currentTarget.classList.add("is-dragover");
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      e.currentTarget.classList.remove("is-dragover");
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    e.currentTarget.classList.remove("is-dragover");
    trySetFile(e.dataTransfer?.files?.[0]);
  }

  const hasFile = Boolean(file && file.size > 0);
  const zoneClass = ["dropzone", hasFile ? "has-file" : ""].filter(Boolean).join(" ");

  return (
    <fieldset className="field-group" aria-labelledby={titleId}>
      <h3 className="field-group__title" id={titleId}>
        {label}
      </h3>
      <div
        className={zoneClass}
        role="group"
        aria-label={label}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <textarea
          id={textareaId}
          className="dropzone__textarea"
          rows={9}
          spellCheck={false}
          placeholder={placeholder}
          aria-describedby={charCountId}
          maxLength={maxText}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="dropzone__file-input"
          accept={FILE_ACCEPT}
          tabIndex={-1}
          aria-label={`选择${label}文件`}
          onChange={(e) => {
            trySetFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="dropzone__footer">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => inputRef.current?.click()}
          >
            选择文件
          </button>
          <span className="dropzone__hint">{fileHint}</span>
          <span id={charCountId} className={charClass} aria-live="polite">
            {charHint}
          </span>
          {hasFile && file && (
            <div className="dropzone__file-badge">
              <span className="dropzone__file-name">{file.name}</span>
              <button
                type="button"
                className="dropzone__clear-file"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFileChange(null);
                }}
              >
                移除
              </button>
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
