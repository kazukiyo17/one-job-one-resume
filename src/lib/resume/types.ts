export type ResumeBasic = {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
};

export type ExperienceItem = {
  company?: string;
  role?: string;
  period?: string;
  description?: string;
};

export type EducationItem = {
  school?: string;
  degree?: string;
  period?: string;
  description?: string;
};

export type ProjectItem = {
  name?: string;
  role?: string;
  period?: string;
  description?: string;
};

export type ActivityItem = ProjectItem;

export type SkillItem = {
  category?: string;
  items?: string;
};

export type ResumeData = {
  basic?: ResumeBasic;
  experience?: ExperienceItem[];
  education?: EducationItem[];
  projects?: ProjectItem[];
  activities?: ActivityItem[];
  skills?: SkillItem[];
};
