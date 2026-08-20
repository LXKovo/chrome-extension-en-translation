# CLAUDE.md

本文件为项目级上下文，Claude Code 会在每次会话自动加载。开发时**按需阅读下方文档索引中的对应文档**，无需用户手动补充上下文。

## 项目简介

一个 **Chrome 浏览器扩展（MV3）**：用户在浏览任意英文网站时，一键提取当前页面的主要文章内容，转为 Markdown 并调用大模型（OpenAI 兼容协议）翻译为中文，
结果以 ChatGPT 打字机效果逐字展示，可下载为 `.md` 文件。仅本地持久化最近一次翻译结果，不维护历史记录。

## 技术栈

- TypeScript（严格模式）+ React 19 + Vite（`@crxjs/vite-plugin`）
- 内容提取：`@mozilla/readability` + `turndown`（+GFM）+ `dompurify`
- 翻译：OpenAI 兼容 SDK（可配 `baseURL` / `model`），默认 `deepseek-v4-flash`
- 渲染：`md-wx`（`MarkdownRenderer`）
- 存储：`chrome.storage.local`

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发构建 |
| `npm run build` | 生产构建 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |

## 项目文档索引（按需阅读）

| 文档 | 内容 | 何时阅读 |
| --- | --- | --- |
| `docs/proposal.md` | 需求文档（功能、输出格式、已确认决策） | 理解需求/验收时 |
| `docs/design.md` | 技术架构（选型、模块、目录、编码规范） | 实现与设计决策时 |
| `docs/layouts/实现步骤.md` | 页面清单与里程碑 | 规划顺序时 |
| `docs/layouts/示意图-主页面.md` | 主页面（Popup）布局 | 开发 UI 时 |
| `docs/layouts/示意图-设置页面.md` | 设置页面布局 | 开发 UI 时 |
| `docs/tasks.md` | 任务拆分（T1–T10，含依赖与验收标准） | **执行每个任务时必读** |
| `.claude/rules/project_rules.md` | 项目开发规则（代码风格、模块边界、安全等） | 编写代码时 |

## 目录结构（核心约束）

```text
src/
├── background/   # 后台 Service Worker：消息路由、翻译、存储
├── content/      # 内容脚本：文章提取与 Markdown 转换
├── popup/        # 弹窗 UI（React）：交互、打字机、md-wx 渲染
└── shared/       # 跨层共享：类型、常量、消息协议
```

- `shared/` 只放无副作用类型/常量/协议；`background`/`content`/`popup` 三者不得互相直接 import，仅通过 `shared` 与 `chrome.runtime` 消息通信。

## AI 任务执行规范（必须遵守）

1. **严格按任务拆分执行**：严格按照 `docs/tasks.md` 中定义的任务范围执行，不超出指定任务边界。
2. **单一任务原则**：每次只执行一个明确指定的任务（如「任务 T1」），完成后等待用户确认再进行下一步。
3. **禁止自动扩展**：不基于架构文档自行扩展任务范围；确需扩展时先通知用户并获确认。
4. **对照自检**：每个任务完成后，对照 `tasks.md` 中该任务的「完成标准 / 可见效果」自检。
5. **异常处理**：任务描述不清晰先询问；存在未完成的依赖时说明依赖关系并等待指示；发现超出范围的代码主动询问是否清理。
