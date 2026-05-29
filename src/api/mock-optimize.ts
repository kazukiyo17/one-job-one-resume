export function getMockOptimizeResponse() {
  return {
    resume: {
      basic: {
        name: "张三",
        title: "用户运营（电商方向）",
        email: "zhangsan@example.com",
        phone: "13800138000",
        location: "上海",
        summary:
          "2 年电商运营经验，熟悉活动执行与 Excel 数据复盘，目标用户增长与活跃运营岗。",
      },
      experience: [
        {
          company: "杭州某电商公司",
          role: "运营助理",
          period: "2022.07 – 至今",
          description:
            "- 协助【618 大促】活动页文案与上新节奏，活动期间咨询量提升约 15%\n- 用 Excel 汇总 UV、转化数据并输出【简易复盘】",
        },
        {
          company: "上海某文化传媒公司",
          role: "内容编辑实习生",
          period: "2021.03 – 2022.06",
          description: "- 撰写公众号推文，单篇阅读均值约 3,000+",
        },
      ],
      education: [
        {
          school: "某某大学",
          degree: "市场营销 · 本科",
          period: "2018 – 2022",
          description: "",
        },
      ],
      projects: [
        {
          name: "店铺大促活动支持",
          role: "",
          period: "2023",
          description:
            "- 参与 618 活动页文案与排期，活动期 GMV 同比提升约 12%（团队口径）",
        },
      ],
      activities: [
        {
          name: "校级新媒体中心",
          role: "干事",
          period: "2019 – 2020",
          description: "- 策划【校园品牌联名】推文 3 篇，累计阅读 1.2 万+",
        },
      ],
      skills: [
        { category: "运营", items: "活动策划 · 用户增长 · 活动复盘" },
        { category: "数据与工具", items: "Excel 数据分析 · 微信运营 · 基础 PS" },
      ],
    },
    suggestions: `## 短期项目建议

- 用 Excel 做一份 7 天用户分层小报（mock）

> 以上为本地 mock。
`,
    analysis: `### JD 与简历差距（mock）

- 需补充用户增长、裂变拉新等 JD 关键词（mock）
`,
    meta: { requestId: "mock-local-" + Date.now() },
  };
}
