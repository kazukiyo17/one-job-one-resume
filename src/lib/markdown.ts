import DOMPurify from "dompurify";
import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: true,
});

function normalizeSuggestionsSource(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  try {
    return "```json\n" + JSON.stringify(raw, null, 2) + "\n```";
  } catch {
    return String(raw);
  }
}

export function renderSuggestionsMarkdown(raw: unknown): string {
  const text = normalizeSuggestionsSource(raw).trim();
  if (!text) return "";
  try {
    const dirty = marked.parse(text) as string;
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
