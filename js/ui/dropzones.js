import { formatFileLimit } from "../limits.js";

/**
 * 合并「文本 + 文件」为同一区域：可粘贴、可拖放、可选文件；两者可同时提交。
 * @param {HTMLFormElement} form
 * @param {{ onDraftChange?: () => void, limits?: import("../limits.js").PayloadLimits, onReject?: (message: string) => void }} [options]
 * @returns {{ restoreFile: (inputName: string, file: File | null) => void }}
 */
export function initInputDropzones(form, options = {}) {
  const { onDraftChange, limits, onReject } = options;
  const notify = () => onDraftChange?.();
  /** @type {Map<string, { setFile: (file: File) => void, clearFile: () => void }>} */
  const fileApis = new Map();

  form.querySelectorAll(".js-dropzone").forEach((zone) => {
    const pickBtn = zone.querySelector(".js-pick-file");
    const fileBadge = /** @type {HTMLElement | null} */ (
      zone.querySelector(".js-file-badge")
    );
    const fileNameEl = zone.querySelector(".js-file-name");
    const clearFileBtn = zone.querySelector(".js-clear-file");

    function fileInput() {
      return /** @type {HTMLInputElement | null} */ (
        zone.querySelector('input[type="file"]')
      );
    }

    const fi0 = fileInput();
    if (!zone.querySelector("textarea") || !fi0) return;

    function syncBadgeFromInput() {
      const fi = fileInput();
      if (!fi) return;
      const f = fi.files?.[0];
      const hasRealFile = Boolean(f && f.size > 0);
      if (hasRealFile) {
        if (fileNameEl) fileNameEl.textContent = f.name;
        if (fileBadge) fileBadge.hidden = false;
        if (clearFileBtn) clearFileBtn.hidden = false;
        zone.classList.add("has-file");
      } else {
        if (fileNameEl) fileNameEl.textContent = "";
        if (fileBadge) fileBadge.hidden = true;
        if (clearFileBtn) clearFileBtn.hidden = true;
        zone.classList.remove("has-file");
      }
    }

    function setFile(file) {
      const fi = fileInput();
      if (!fi || !file || file.size === 0) return;
      if (limits && file.size > limits.maxFileBytes) {
        onReject?.(
          `文件过大，请选择不超过 ${formatFileLimit(limits.maxFileBytes)} 的文件。`,
        );
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      fi.files = dt.files;
      syncBadgeFromInput();
      notify();
    }

    /** 用全新 file 节点替换；避免 clone 在个别环境下仍带文件状态 */
    function clearFile() {
      const old = fileInput();
      if (!old?.parentNode) return;
      const parent = old.parentNode;
      const fresh = document.createElement("input");
      fresh.type = "file";
      fresh.name = old.name;
      if (old.id) fresh.id = old.id;
      fresh.className = old.className;
      if (old.accept) fresh.accept = old.accept;
      fresh.tabIndex = old.tabIndex;
      const aria = old.getAttribute("aria-label");
      if (aria) fresh.setAttribute("aria-label", aria);
      parent.insertBefore(fresh, old);
      old.remove();
      bindFileChange(fresh);
      syncBadgeFromInput();
      notify();
    }

    /**
     * @param {HTMLInputElement} fi
     */
    function bindFileChange(fi) {
      fi.addEventListener("change", () => {
        syncBadgeFromInput();
        notify();
      });
    }

    bindFileChange(fi0);
    if (fi0.name) {
      fileApis.set(fi0.name, { setFile, clearFile });
    }

    pickBtn?.addEventListener("click", () => {
      fileInput()?.click();
    });

    zone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add("is-dragover");
    });

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });

    zone.addEventListener("dragleave", (e) => {
      const rel = e.relatedTarget;
      if (rel instanceof Node && zone.contains(rel)) return;
      zone.classList.remove("is-dragover");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove("is-dragover");
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(f);
    });

    clearFileBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearFile();
    });
  });

  form.addEventListener(
    "reset",
    () => {
      queueMicrotask(() => {
        form.querySelectorAll(".js-dropzone").forEach((z) => {
          z.classList.remove("is-dragover", "has-file");
          const badge = z.querySelector(".js-file-badge");
          if (badge) badge.hidden = true;
          const rm = z.querySelector(".js-clear-file");
          if (rm) rm.hidden = true;
        });
      });
    },
    { passive: true },
  );

  return {
    restoreFile(inputName, file) {
      const api = fileApis.get(inputName);
      if (!api) return;
      if (file && file.size > 0) api.setFile(file);
      else api.clearFile();
    },
  };
}
