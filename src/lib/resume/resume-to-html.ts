import type { ResumeData } from "./types";

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDescHtml(text: string): string {
  const escaped = escapeHtml(text);
  const withKw = escaped.replace(
    /【([^】]+)】/g,
    '<span class="kw">$1</span>',
  );
  return withKw.replace(/\n/g, "<br />\n");
}

function joinHeadline(parts: (string | undefined)[]): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
}

function renderExperienceItem(item: {
  company?: string;
  role?: string;
  period?: string;
  description?: string;
}) {
  const head = joinHeadline([item.company, item.role, item.period]);
  const desc = String(item.description ?? "").trim();
  if (!head && !desc) return "";
  return `<article class="entry">${head ? `<h3>${head}</h3>` : ""}${desc ? `<div class="desc">${formatDescHtml(desc)}</div>` : ""}</article>`;
}

function renderEducationItem(item: {
  school?: string;
  degree?: string;
  period?: string;
  description?: string;
}) {
  const head = joinHeadline([item.school, item.degree, item.period]);
  const desc = String(item.description ?? "").trim();
  if (!head && !desc) return "";
  return `<article class="entry">${head ? `<h3>${head}</h3>` : ""}${desc ? `<div class="desc">${formatDescHtml(desc)}</div>` : ""}</article>`;
}

function renderNamedItem(item: {
  name?: string;
  role?: string;
  period?: string;
  description?: string;
}) {
  const head = joinHeadline([item.name, item.role, item.period]);
  const desc = String(item.description ?? "").trim();
  if (!head && !desc) return "";
  return `<article class="entry">${head ? `<h3>${head}</h3>` : ""}${desc ? `<div class="desc">${formatDescHtml(desc)}</div>` : ""}</article>`;
}

function wrapSection(title: string, html: string) {
  if (!html.trim()) return "";
  return `<section><h2>${escapeHtml(title)}</h2>${html}</section>`;
}

export function resumeToHtml(resume: ResumeData | null | undefined): string {
  if (!resume || typeof resume !== "object") return "";

  const basic = resume.basic ?? {};
  const name = escapeHtml(basic.name);
  const title = escapeHtml(basic.title);
  const contactParts = [basic.email, basic.phone, basic.location]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .map(escapeHtml);

  const summary = String(basic.summary ?? "").trim();
  const summaryHtml = summary
    ? `<p class="summary">${escapeHtml(summary)}</p>`
    : "";

  const contactHtml = contactParts.length
    ? `<p class="contact">${contactParts.join(" · ")}</p>`
    : "";

  const experienceHtml = (resume.experience ?? [])
    .map(renderExperienceItem)
    .filter(Boolean)
    .join("");
  const educationHtml = (resume.education ?? [])
    .map(renderEducationItem)
    .filter(Boolean)
    .join("");
  const projectsHtml = (resume.projects ?? [])
    .map(renderNamedItem)
    .filter(Boolean)
    .join("");
  const activitiesHtml = (resume.activities ?? [])
    .map(renderNamedItem)
    .filter(Boolean)
    .join("");

  let skillsHtml = "";
  if (Array.isArray(resume.skills) && resume.skills.length > 0) {
    skillsHtml = resume.skills
      .map((s) => {
        const cat = escapeHtml(s.category);
        const items = escapeHtml(s.items);
        if (!cat && !items) return "";
        if (cat && items) {
          return `<div class="skill-row"><strong>${cat}</strong>：${items}</div>`;
        }
        return `<div class="skill-row">${cat || items}</div>`;
      })
      .filter(Boolean)
      .join("");
  }

  const sectionsHtml = [
    wrapSection("工作经历", experienceHtml),
    wrapSection("教育经历", educationHtml),
    wrapSection("项目经历", projectsHtml),
    wrapSection("活动经历", activitiesHtml),
    wrapSection("技能", skillsHtml),
  ].join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name || "简历"}</title>
  <style>
    body { font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1.25rem; color: #0f172a; line-height: 1.65; font-size: 14px; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    .subtitle { color: #334155; font-size: 1.05rem; margin: 0 0 0.5rem; font-weight: 600; }
    .contact, .summary { color: #475569; margin: 0.35rem 0; }
    h2 { font-size: 1rem; margin: 1.25rem 0 0.5rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.2rem; color: #1e293b; }
    h3 { font-size: 0.95rem; margin: 0.75rem 0 0.25rem; font-weight: 600; }
    .entry { margin: 0.35rem 0 0.65rem; }
    .desc { margin: 0.2rem 0 0.4rem; }
    .skill-row { margin: 0.35rem 0; }
    .kw { color: #ea580c; font-weight: 500; }
  </style>
</head>
<body>
  <header>
    <h1>${name}</h1>
    ${title ? `<p class="subtitle">${title}</p>` : ""}
    ${contactHtml}
    ${summaryHtml}
  </header>
  ${sectionsHtml}
</body>
</html>`;
}
