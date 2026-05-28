import { postOptimize } from "./api/client.js";
import { buildOptimizePayload } from "./ui/forms.js";
import { initInputDropzones } from "./ui/dropzones.js";
import { getLimits, formatLimitHints } from "./limits.js";
import { initCharCounter } from "./ui/char-counter.js";
import { renderSuggestionsMarkdown } from "./ui/markdown.js";
import {
  saveSessionResults,
  loadSessionResults,
  clearSessionResults,
} from "./ui/session-results.js";
import {
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
} from "./ui/session-form-draft.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {string} [html]
 */
function setPreviewHtml(iframe, html) {
  if (!iframe) return;
  iframe.srcdoc = html && html.trim() ? html : "";
}

/**
 * @param {(name: string) => void} [onUserSelectTab]
 * @returns {{ setActiveTab: (name: string) => void }}
 */
function initTabs(onUserSelectTab) {
  const buttons = document.querySelectorAll(".tabs__btn");
  const panels = {
    html: $("tab-html"),
    text: $("tab-text"),
    analysis: $("tab-analysis"),
    tips: $("tab-tips"),
  };

  function setActiveTab(name) {
    if (!name || !panels[/** @type {keyof typeof panels} */ (name)]) return;

    buttons.forEach((b) => {
      const tab = b.getAttribute("data-tab");
      const on = tab === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });

    Object.entries(panels).forEach(([key, panel]) => {
      const on = key === name;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-tab");
      if (!name || !panels[/** @type {keyof typeof panels} */ (name)]) return;
      setActiveTab(name);
      onUserSelectTab?.(name);
    });
  });

  return { setActiveTab };
}

/**
 * @param {string} html
 * @returns {Window | null}
 */
function openHtmlInNewTab(html) {
  const trimmed = (html || "").trim();
  if (!trimmed) return null;
  const blob = new Blob([trimmed], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) {
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } else {
    URL.revokeObjectURL(url);
  }
  return win;
}

/**
 * @param {(...args: never[]) => void} fn
 * @param {number} ms
 */
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * @param {HTMLFormElement} form
 */
function readDraftFromForm(form) {
  const resumeEl = form.elements.namedItem("resume_str");
  const jdEl = form.elements.namedItem("job_desc");
  const resumeFileEl = form.elements.namedItem("resume_file");
  const jdFileEl = form.elements.namedItem("jd_file");

  const resumeText =
    resumeEl instanceof HTMLTextAreaElement ? resumeEl.value : "";
  const jobDesc = jdEl instanceof HTMLTextAreaElement ? jdEl.value : "";
  const resumeFile =
    resumeFileEl instanceof HTMLInputElement
      ? resumeFileEl.files?.[0] ?? null
      : null;
  const jdFile =
    jdFileEl instanceof HTMLInputElement ? jdFileEl.files?.[0] ?? null : null;

  return { resumeText, jobDesc, resumeFile, jdFile };
}

async function main() {
  const form = /** @type {HTMLFormElement} */ ($("form-optimize"));
  const hint = $("form-hint");
  const btnSubmit = $("btn-submit");
  const panelStatus = $("panel-status");
  const panelResults = $("panel-results");
  const outText = $("out-text");
  const outAnalysis = $("out-analysis");
  const outTips = $("out-tips");
  const previewFrame = /** @type {HTMLIFrameElement} */ ($("preview-frame"));

  let abortCtrl = null;
  /** @type {string} */
  let lastResumeHtml = "";
  /** @type {{ optimizedText: string, analysis: string, suggestions: string, html: string, activeTab: string } | null} */
  let cachedResult = null;

  const persistDraft = debounce(() => {
    saveFormDraft(readDraftFromForm(form));
  }, 400);

  const limits = getLimits();
  const limitHints = formatLimitHints(limits);
  const resumeTa = /** @type {HTMLTextAreaElement} */ ($("resume-text"));
  const jdTa = /** @type {HTMLTextAreaElement} */ ($("jd-text"));
  resumeTa.maxLength = limits.maxResumeText;
  jdTa.maxLength = limits.maxJdText;

  const resumeFileHint = document.querySelector(".js-resume-file-hint");
  const jdFileHint = document.querySelector(".js-jd-file-hint");
  const resumeTextHint = /** @type {HTMLElement} */ (
    document.querySelector(".js-resume-text-hint")
  );
  const jdTextHint = /** @type {HTMLElement} */ (
    document.querySelector(".js-jd-text-hint")
  );
  if (resumeFileHint) resumeFileHint.textContent = `支持 PDF、Word，${limitHints.file}`;
  if (jdFileHint) jdFileHint.textContent = `支持 PDF、Word，${limitHints.file}`;

  const resumeCounter = resumeTextHint
    ? initCharCounter(resumeTa, resumeTextHint, limits.maxResumeText)
    : null;
  const jdCounter = jdTextHint
    ? initCharCounter(jdTa, jdTextHint, limits.maxJdText)
    : null;

  const dropzones = initInputDropzones(form, {
    onDraftChange: persistDraft,
    limits,
    onReject: (msg) => {
      hint.textContent = msg;
      hint.style.color = "var(--danger, #e11d48)";
    },
  });

  form.addEventListener("input", (ev) => {
    if (ev.target instanceof HTMLTextAreaElement) persistDraft();
  });

  const draft = await loadFormDraft();
  if (draft) {
    resumeTa.value = draft.resumeText;
    jdTa.value = draft.jobDesc;
    resumeCounter?.refresh();
    jdCounter?.refresh();
    if (draft.resumeFile) dropzones.restoreFile("resume_file", draft.resumeFile);
    if (draft.jdFile) dropzones.restoreFile("jd_file", draft.jdFile);
  }

  const { setActiveTab } = initTabs((name) => {
    if (!cachedResult) return;
    cachedResult = { ...cachedResult, activeTab: name };
    saveSessionResults(cachedResult);
  });
  $("btn-open-resume-tab").addEventListener("click", () => {
    if (!lastResumeHtml.trim()) {
      hint.textContent = "当前没有可打开的 HTML 简历，请先完成优化。";
      hint.style.color = "var(--danger, #e11d48)";
      return;
    }
    hint.style.color = "";
    openHtmlInNewTab(lastResumeHtml);
  });

  form.addEventListener("reset", () => {
    hint.textContent = "";
    hint.style.color = "";
    panelStatus.className = "panel-status panel-status--hidden";
    panelResults.classList.add("panel-results--hidden");
    lastResumeHtml = "";
    cachedResult = null;
    clearSessionResults();
    clearFormDraft();
    outText.innerHTML = "";
    outAnalysis.innerHTML = "";
    outTips.innerHTML = "";
    setPreviewHtml(previewFrame, "");
    if (abortCtrl) abortCtrl.abort();
    queueMicrotask(() => {
      resumeCounter?.refresh();
      jdCounter?.refresh();
    });
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    hint.textContent = "";
    hint.style.color = "";

    const built = buildOptimizePayload(form);
    if (!built.ok) {
      hint.textContent = built.message || "";
      return;
    }

    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    panelResults.classList.add("panel-results--hidden");
    panelStatus.className = "panel-status panel-status--loading";
    panelStatus.textContent = "AI 正在加班加点打磨简历，稍等片刻～（长文档可能要一两分钟）";
    btnSubmit.disabled = true;

    try {
      const data = await postOptimize(built.formData, abortCtrl.signal);

      outText.innerHTML = renderSuggestionsMarkdown(data.optimizedText);
      outAnalysis.innerHTML = renderSuggestionsMarkdown(data.analysis);
      outTips.innerHTML = renderSuggestionsMarkdown(data.suggestions);
      lastResumeHtml = data.html || "";
      setPreviewHtml(previewFrame, lastResumeHtml);

      cachedResult = {
        optimizedText: String(data.optimizedText || ""),
        analysis: String(data.analysis || ""),
        suggestions: String(data.suggestions || ""),
        html: lastResumeHtml,
        activeTab: "html",
      };
      setActiveTab("html");
      saveSessionResults(cachedResult);

      panelStatus.className = "panel-status panel-status--hidden";
      panelResults.classList.remove("panel-results--hidden");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误";
      panelStatus.className = "panel-status panel-status--error";
      panelStatus.textContent = msg;
    } finally {
      btnSubmit.disabled = false;
    }
  });

  const saved = loadSessionResults();
  if (
    saved &&
    (saved.html ||
      saved.optimizedText ||
      saved.analysis ||
      saved.suggestions)
  ) {
    cachedResult = {
      optimizedText: saved.optimizedText,
      analysis: saved.analysis,
      suggestions: saved.suggestions,
      html: saved.html,
      activeTab: saved.activeTab || "html",
    };
    outText.innerHTML = renderSuggestionsMarkdown(saved.optimizedText);
    outAnalysis.innerHTML = renderSuggestionsMarkdown(saved.analysis);
    outTips.innerHTML = renderSuggestionsMarkdown(saved.suggestions);
    lastResumeHtml = saved.html;
    setPreviewHtml(previewFrame, lastResumeHtml);
    setActiveTab(saved.activeTab || "html");
    panelStatus.className = "panel-status panel-status--hidden";
    panelResults.classList.remove("panel-results--hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => console.error(e));
});
