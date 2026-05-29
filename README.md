# 1Job1Resume

在线简历优化工具：**静态前端** + **EdgeOne Pages Cloud Functions** + **[Dify](https://dify.ai) Workflow**。用户上传或粘贴简历与目标岗位 JD，后端调用 Dify 工作流，前端展示优化后的 **HTML 简历预览**与 **Markdown 提升建议**。

> 产品目标、实现细节、Dify 工作流、API 契约与部署见 **[docs/design.md](./docs/design.md)**。

---

## 功能


| 能力      | 说明                                                            |
| ------- | ------------------------------------------------------------- |
| 双通道输入   | 简历 / JD 均支持 Word、PDF 文件或纯文本，至少各有一条有效输入                        |
| 优化结果    | iframe 内预览 HTML 简历，可新标签页打开另存                                  |
| 提升建议    | `suggestions` 字段按 Markdown 渲染（`marked` + `DOMPurify`）         |
| 本地 mock | `index.html` 或 `.env` 中 `MOCK_OPTIMIZE=true` 时无需后端即可调试 UI   |
| 限流      | 可选 KV 固定窗口限流（按 IP / 全站），见 `cloud-functions/api/rate-limit.js` |


页面提示用户自行保存生成内容；本站不落库存储用户简历。

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite，构建产物输出至 `dist/`
- **后端**：`cloud-functions/api/optimize.js`（`POST /api/optimize`，multipart → Dify 上传与工作流）
- **托管**：EdgeOne Pages 静态资源 + Cloud Functions（`edgeone.json` 默认 `maxDuration` 120s）
- **AI**：Dify Workflow；API Key 仅在后端环境变量中配置

---

## 目录结构

```
resume-promote/
├── index.html, src/               # React 前端源码（Vite 入口）
├── dist/                          # npm run build 产物（部署用）
├── cloud-functions/api/
│   ├── optimize.js                # 主 API
│   └── rate-limit.js              # KV 限流
├── edgeone.json                   # Cloud Functions 配置
├── docs/
│   └── design.md                  # 需求、实现与 API 契约
└── .env.example                  # 环境变量模板（复制为 .env）
```

`.edgeone/` 为 CLI 生成物，日常以 `cloud-functions/` 与静态文件为准。

---

## 快速开始

### 仅预览前端

```bash
cd resume-promote
npm install
npm run dev
```

浏览器打开终端里 Vite 打印的地址（默认 **`http://127.0.0.1:5173/`** 或 `http://localhost:5173/`）。须保持该终端窗口运行；关掉后页面会显示「找不到网页」。

> **注意**：若你用的是 `edgeone pages dev`，前端在 **`http://localhost:8088/`**，不是 5173。5173 仅在使用 `npm run dev` 单独起 Vite 时有效。

在 `index.html` 将 `window.__ENV__.MOCK_OPTIMIZE` 设为 `true`，或在 `.env` 中设置 `VITE_MOCK_OPTIMIZE=true`，即可用本地 mock 联调 UI（无需后端）。

生产构建：

```bash
npm run build
npm run preview   # 本地预览 dist/
```

### 联调真实 Dify

1. 在 Dify 发布 **Workflow 应用**并创建 API Key；工作流输入/输出变量名需与后端默认或环境变量映射一致（见下方「环境变量」及 [design.md](./docs/design.md) 第二节）。
2. 复制 `.env.example` 为 `.env`，填写 `DIFY_API_KEY` 等变量（**勿提交 `.env`**）。
3. 安装 [EdgeOne CLI](https://pages.edgeone.ai/zh/document/edgeone-cli)，在项目根目录执行：

```bash
edgeone pages dev
```

浏览器访问 CLI 提示的地址（常见 `http://localhost:8088/`）。开发 React 前端时另开终端执行 `npm run dev`，Vite 会将 `/api` 代理到 `8088`。`API_BASE` 保持空字符串时请求走同源 `/api/optimize`。

EdgeOne Pages 部署前端时，在控制台配置构建命令 `npm ci && npm run build`，输出目录 `dist/`。

---

## 环境变量

### 前端（`index.html` → `window.__ENV__` 或 `.env` → `VITE_*`）


| 变量                 | 说明             |
| ------------------ | -------------- |
| `API_BASE` / `VITE_API_BASE` | 后端根地址，同源留空 |
| `MOCK_OPTIMIZE` / `VITE_MOCK_OPTIMIZE` | `true` 时跳过网络请求 |
| `MOCK_DELAY_MS` / `VITE_MOCK_DELAY_MS` | mock 延迟毫秒数 |
| `MAX_FILE_BYTES` 等 / `VITE_MAX_*` | 与后端同名限额，留空用默认值 |


### 后端（Pages 环境变量或 `.env`）


| 变量                 | 必填  | 说明                                                                 |
| ------------------ | --- | ------------------------------------------------------------------ |
| `DIFY_API_KEY`     | 是   | Dify Workflow API Key                                              |
| `DIFY_API_URL`     | 否   | 默认 `https://api.dify.ai`                                           |
| `DIFY_INPUT_*`     | 否   | 工作流输入字段映射，默认 `resume_str` / `job_desc` / `resume_file` / `jd_file` |
| `DIFY_OUTPUT_*`    | 否   | 工作流输出映射，仅 `resume_json` / `analyse` / `suggestions` → API `resume` / `analysis` / `suggestions` |
| `CORS_ORIGIN`      | 否   | 默认 `*`；上线建议改为站点 Origin                                             |
| `MAX_FILE_BYTES` 等 | 否   | 上传与文本长度限制                                                          |
| `RATE_LIMIT_*`     | 否   | KV 限流，详见 `rate-limit.js` 文件头注释                                     |


完整示例见 `.env.example`。

### KV 限流（生产推荐）

1. 在 [Pages 控制台](https://console.tencentcloud.com/edgeone/pages) 开通 KV，创建 Namespace 并绑定到项目。
2. 绑定变量名与 `RATE_LIMIT_KV_BINDING` 一致（默认 `RESUME_PROMOTE_KV`）。
3. 配置 `RATE_LIMIT_IP_MAX_REQUESTS`、`RATE_LIMIT_GLOBAL_MAX_REQUESTS` 等；超限返回 `429`，`error.code` 为 `RATE_LIMIT_IP_EXCEEDED` 或 `RATE_LIMIT_GLOBAL_EXCEEDED`。

---

## API 摘要

`**POST /api/optimize**` · `Content-Type: multipart/form-data`


| 字段            | 说明             |
| ------------- | -------------- |
| `resume_str`  | 简历文本           |
| `job_desc`    | JD 文本          |
| `resume_file` | 简历文件（Word/PDF） |
| `jd_file`     | JD 文件          |


成功响应 JSON 字段：`resume`（对象）、`analysis`、`suggestions`，及 `meta.requestId`。错误体为 `{ error: { code, message } }`。

字段名、错误码与前端处理见 [design.md](./docs/design.md) 第三节。

---

## 安全提示

- **切勿**将 `DIFY_API_KEY` 或真实 `.env` 提交到 Git。
- Dify API Key 仅存在于后端；浏览器通过自有 API 间接调用工作流。
- HTML 预览由前端根据 `resume` JSON 本地渲染，iframe 沙箱展示；文本均经转义，勿拼接未消毒的模型 HTML。
- 「不存储」指本站不持久化用户内容；上游（Dify 等）日志策略以其官方说明为准。

