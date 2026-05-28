import { marked } from "marked";
import DOMPurify from "dompurify";

marked.use({
  gfm: true,
  breaks: true,
});

/**
 * @param {unknown} raw API `suggestions`：字符串（Markdown）或其它（序列化为代码块）
 */
function normalizeSuggestionsSource(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  try {
    return "```json\n" + JSON.stringify(raw, null, 2) + "\n```";
  } catch {
    return String(raw);
  }
}

/**
 * @param {unknown} raw
 * @returns {string} 可赋给 innerHTML 的安全 HTML
 */
export function renderSuggestionsMarkdown(raw) {
  const text = normalizeSuggestionsSource(raw).trim();
  if (!text) return "";
  try {
    const dirty = marked.parse(text);
    return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
  } catch {
    const wrap = document.createElement("div");
    const pre = document.createElement("pre");
    pre.className = "md-fallback";
    pre.textContent = normalizeSuggestionsSource(raw);
    wrap.appendChild(pre);
    return wrap.innerHTML;
  }
}
