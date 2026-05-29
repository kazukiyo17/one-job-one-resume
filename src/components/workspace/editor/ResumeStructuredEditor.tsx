import type { EditableResult } from "../../../lib/resume/serialize";
import type {
  ActivityItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeData,
  SkillItem,
} from "../../../lib/resume/types";
import { EntryListSection } from "./EntryListSection";
import { FormField } from "./FormField";

const EMPTY_EXPERIENCE: ExperienceItem = {
  company: "",
  role: "",
  period: "",
  description: "",
};

const EMPTY_EDUCATION: EducationItem = {
  school: "",
  degree: "",
  period: "",
  description: "",
};

const EMPTY_PROJECT: ProjectItem = {
  name: "",
  role: "",
  period: "",
  description: "",
};

const EMPTY_ACTIVITY: ActivityItem = {
  name: "",
  role: "",
  period: "",
  description: "",
};

const EMPTY_SKILL: SkillItem = { category: "", items: "" };

type ResumeStructuredEditorProps = {
  data: EditableResult;
  onChange: (data: EditableResult) => void;
};

function summarizeExperience(item: ExperienceItem) {
  const parts = [item.company, item.role].filter(Boolean);
  return {
    title: parts.length ? parts.join(" · ") : "未命名工作经历",
    subtitle: item.period,
  };
}

function summarizeEducation(item: EducationItem) {
  const parts = [item.school, item.degree].filter(Boolean);
  return {
    title: parts.length ? parts.join(" · ") : "未命名教育经历",
    subtitle: item.period,
  };
}

function summarizeNamed(item: { name?: string; role?: string; period?: string }) {
  return {
    title: item.name?.trim() || "未命名条目",
    subtitle: [item.role, item.period].filter(Boolean).join(" · ") || undefined,
  };
}

function summarizeSkill(item: SkillItem) {
  return {
    title: item.category?.trim() || "技能",
    subtitle: item.items?.trim() || undefined,
  };
}

export function ResumeStructuredEditor({
  data,
  onChange,
}: ResumeStructuredEditorProps) {
  const resume = data.resume;
  const basic = resume.basic ?? {};

  const patchResume = (patch: Partial<ResumeData>) => {
    onChange({ ...data, resume: { ...resume, ...patch } });
  };

  const patchBasic = (field: keyof typeof basic, value: string) => {
    patchResume({ basic: { ...basic, [field]: value } });
  };

  return (
    <div className="structured-editor">
      <div className="structured-editor__head">
        <h2 className="structured-editor__title">编辑简历</h2>
        <p className="structured-editor__privacy" role="note">
          <strong>隐私说明：</strong>
          本站不会在服务器存储你的个人信息、简历或 JD；生成结果也不会替你存档。
          <strong>请在生成后尽快自行保存</strong>。
        </p>
      </div>

      <div className="structured-editor__scroll">
        <section className="editor-section">
          <h3 className="editor-section__title">基本信息</h3>
          <div className="editor-section__grid">
            <FormField
              label="姓名"
              value={basic.name ?? ""}
              onChange={(v) => patchBasic("name", v)}
            />
            <FormField
              label="求职意向 / 头衔"
              value={basic.title ?? ""}
              onChange={(v) => patchBasic("title", v)}
            />
            <FormField
              label="邮箱"
              value={basic.email ?? ""}
              onChange={(v) => patchBasic("email", v)}
            />
            <FormField
              label="电话"
              value={basic.phone ?? ""}
              onChange={(v) => patchBasic("phone", v)}
            />
            <FormField
              label="所在地"
              value={basic.location ?? ""}
              onChange={(v) => patchBasic("location", v)}
            />
          </div>
          <FormField
            label="个人简介"
            value={basic.summary ?? ""}
            multiline
            rows={4}
            onChange={(v) => patchBasic("summary", v)}
          />
        </section>

        <EntryListSection
          title="工作经历"
          sectionId="experience"
          items={resume.experience ?? []}
          emptyItem={EMPTY_EXPERIENCE}
          addLabel="添加经历"
          fields={[
            { key: "company", label: "公司" },
            { key: "role", label: "职位" },
            { key: "period", label: "时间", placeholder: "如 2022.07 – 至今" },
            {
              key: "description",
              label: "工作描述",
              multiline: true,
              rows: 6,
            },
          ]}
          summarize={summarizeExperience}
          onChange={(items) => patchResume({ experience: items })}
        />

        <EntryListSection
          title="教育经历"
          sectionId="education"
          items={resume.education ?? []}
          emptyItem={EMPTY_EDUCATION}
          addLabel="添加教育"
          fields={[
            { key: "school", label: "学校" },
            { key: "degree", label: "学历 / 专业" },
            { key: "period", label: "时间" },
            {
              key: "description",
              label: "补充说明",
              multiline: true,
              rows: 3,
            },
          ]}
          summarize={summarizeEducation}
          onChange={(items) => patchResume({ education: items })}
        />

        <EntryListSection
          title="项目经历"
          sectionId="projects"
          items={resume.projects ?? []}
          emptyItem={EMPTY_PROJECT}
          addLabel="添加项目"
          fields={[
            { key: "name", label: "项目名称" },
            { key: "role", label: "角色" },
            { key: "period", label: "时间" },
            {
              key: "description",
              label: "项目描述",
              multiline: true,
              rows: 5,
            },
          ]}
          summarize={summarizeNamed}
          onChange={(items) => patchResume({ projects: items })}
        />

        <EntryListSection
          title="活动经历"
          sectionId="activities"
          items={resume.activities ?? []}
          emptyItem={EMPTY_ACTIVITY}
          addLabel="添加活动"
          fields={[
            { key: "name", label: "活动名称" },
            { key: "role", label: "角色" },
            { key: "period", label: "时间" },
            {
              key: "description",
              label: "描述",
              multiline: true,
              rows: 4,
            },
          ]}
          summarize={summarizeNamed}
          onChange={(items) => patchResume({ activities: items })}
        />

        <EntryListSection
          title="技能"
          sectionId="skills"
          items={resume.skills ?? []}
          emptyItem={EMPTY_SKILL}
          addLabel="添加技能组"
          fields={[
            { key: "category", label: "类别", placeholder: "如 数据分析" },
            {
              key: "items",
              label: "技能项",
              multiline: true,
              rows: 2,
              placeholder: "用 · 分隔多项技能",
            },
          ]}
          summarize={summarizeSkill}
          onChange={(items) => patchResume({ skills: items })}
        />
      </div>
    </div>
  );
}
