export function openHtmlInNewTab(html: string): Window | null {
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
