import type { ResumeBasic, ResumeData } from "./types";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
}

function pickFields(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = str(obj[k]);
  return out;
}

function hasEntryContent(item: Record<string, string>) {
  return Object.values(item).some((v) => v.length > 0);
}

function normalizeEntryList(
  v: unknown,
  keys: string[],
  fallback: Record<string, string> = {},
) {
  if (Array.isArray(v)) {
    return v
      .filter((x) => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => pickFields(x as Record<string, unknown>, keys))
      .filter(hasEntryContent);
  }
  const text = str(v);
  if (!text) return [];
  return [{ ...fallback, [keys[keys.length - 1]]: text }];
}

function normalizeBasic(raw: Record<string, unknown>): ResumeBasic {
  const legacyBasic =
    raw.basic && typeof raw.basic === "object" && !Array.isArray(raw.basic)
      ? (raw.basic as Record<string, unknown>)
      : null;
  const profile =
    raw.profile && typeof raw.profile === "object" && !Array.isArray(raw.profile)
      ? (raw.profile as Record<string, unknown>)
      : null;

  const pick = (key: string) =>
    str(legacyBasic?.[key] ?? profile?.[key] ?? raw[key]);

  return {
    name: pick("name"),
    title: pick("title"),
    email: pick("email"),
    phone: pick("phone"),
    location: pick("location"),
    summary: pick("summary"),
  };
}

export function normalizeResume(raw: Record<string, unknown>): ResumeData | null {
  const basic = normalizeBasic(raw);

  let experience = normalizeEntryList(raw.experience, [
    "company",
    "role",
    "period",
    "description",
  ]);
  const education = normalizeEntryList(raw.education, [
    "school",
    "degree",
    "period",
    "description",
  ]);
  const projects = normalizeEntryList(raw.projects, [
    "name",
    "role",
    "period",
    "description",
  ]);
  const activities = normalizeEntryList(raw.activities, [
    "name",
    "role",
    "period",
    "description",
  ]);

  let skills: { category: string; items: string }[] = [];
  if (Array.isArray(raw.skills)) {
    skills = raw.skills
      .filter((x) => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => {
        const o = x as Record<string, unknown>;
        return { category: str(o.category), items: str(o.items) };
      })
      .filter((s) => s.category || s.items);
  } else {
    const text = str(raw.skills);
    if (text) skills = [{ category: "", items: text }];
  }

  const legacyContent = str(raw.content) || str(raw.body);
  if (legacyContent && experience.length === 0) {
    experience = [
      { company: "", role: "", period: "", description: legacyContent },
    ];
  }

  if (!basic.name && !basic.title) return null;

  return {
    basic,
    experience,
    education,
    projects,
    activities,
    skills,
  };
}

export function isValidResume(resume: unknown): resume is ResumeData {
  if (!resume || typeof resume !== "object") return false;
  const r = resume as ResumeData;
  const basic = r.basic;
  if (!basic || typeof basic !== "object") return false;
  if (!str(basic.name)) return false;
  if (!str(basic.title)) return false;

  const lists = [
    r.experience,
    r.education,
    r.projects,
    r.activities,
    r.skills,
  ];
  return lists.some((list) => Array.isArray(list) && list.length > 0);
}
