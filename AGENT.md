# AGENT.md

本文件为项目级上下文，每次会话自动加载。开发时**按需阅读下方文档索引中的对应文档**，无需用户手动补充上下文。

> 详细开发规则见 `.trae/rules/AGENT.md`，此处不重复。

## 项目简介

一个 **Chrome 浏览器扩展（MV3）**：用户在浏览任意英文网站时，一键提取当前页面的主要文章内容，转为 Markdown 并调用大模型（OpenAI 兼容协议）翻译为中文，结果以 ChatGPT 打字机效果逐字展示，
可下载为 `.md` 文件。仅本地持久化最近一次翻译结果，不维护历史记录。

## 技术栈

- TypeScript（严格模式）+ React 18 + Vite（`@crxjs/vite-plugin`）
- 内容提取：`@mozilla/readability` + `turndown`（+GFM）+ `dompurify`
- 翻译：OpenAI 兼容 SDK（可配 `baseURL` / `model`），默认 `deepseek-v4-flash`
- 渲染：`md-wx`（`MarkdownRenderer`）
- 存储：`chrome.storage.local`

## 常用命令

| 命令             | 说明       |
| ---------------- | ---------- |
| `npm run dev`    | 开发构建   |
| `npm run build`  | 生产构建   |
| `npm run lint`   | 代码检查   |
| `npm run format` | 代码格式化 |

## 项目文档索引（按需阅读）

| 文档                              | 内容                                                    | 何时阅读               |
| --------------------------------- | ------------------------------------------------------- | ---------------------- |
| `docs/proposal.md`                | 需求文档（功能、输出格式、已确认决策）                  | 理解需求/验收时        |
| `docs/design.md`                  | 技术架构（选型、模块、目录、编码规范）                  | 实现与设计决策时       |
| `docs/layouts/实现步骤.md`        | 页面清单与里程碑                                        | 规划顺序时             |
| `docs/layouts/示意图-主页面.md`   | 主页面（侧边栏）布局                                    | 开发 UI 时             |
| `docs/layouts/示意图-设置页面.md` | 设置页面布局                                            | 开发 UI 时             |
| `docs/tasks.md`                   | 任务拆分（T1–T10，含依赖与验收标准）                    | **执行每个任务时必读** |
| `.trae/rules/AGENT.md`            | 项目开发规则（代码风格、模块边界、安全、AI 任务规范等） | 编写代码时             |
