# 项目开发规则

> 本规则面向在本项目中进行开发的 AI。规则以**高层面的指导原则**为主，不涉及具体实现细节；实现细节以 `docs/design.md` 与 `docs/tasks.md` 为准。
>
> 依据文档：
> - 需求：`docs/proposal.md`
> - 技术架构：`docs/design.md`
> - 页面布局：`docs/layouts/`
> - 任务拆分：`docs/tasks.md`

## 1. 技术栈与语言规范

- **语言**：TypeScript，全程开启严格模式（`strict: true`），显式禁用 `any`（确需时须注释说明）。
- **框架**：React 18（受 `md-wx` 限制，详见 `design.md` §2）；UI 全部使用函数组件 + Hooks。
- **平台**：Chrome 扩展（Manifest V3）。
- **构建**：Vite + `@crxjs/vite-plugin`，多入口打包（content / popup / background）。
- **渲染**：Markdown 结果统一使用 `md-wx` 的 `MarkdownRenderer`，不自行编写 Markdown 渲染逻辑。
- **翻译**：通过 OpenAI 兼容协议调用（`openai` SDK，可配置 `baseURL` 与 `model`），不写死具体模型提供商。

## 2. 代码风格规范

- **统一工具**：ESLint（typescript-eslint + react-hooks）、Prettier；提交前由 lint-staged 自动执行检查与格式化。
- **命名**：
  - 文件/目录：kebab-case（如 `message-protocol.ts`）
  - 组件：PascalCase；函数/变量：camelCase；常量：UPPER_SNAKE_CASE
  - 类型/接口：PascalCase，接口不加 `I` 前缀
  - 布尔变量：`is` / `has` / `should` 前缀
- **结构原则**：每个模块只做一件事，导出清晰的公共接口；异步统一 `async/await`；错误显式处理，不静默失败。
- **注释**：解释「为什么」，而非复述「做了什么」。

## 3. 依赖与 NPM 包管理

- **包管理器**：统一使用 **npm**，提交 `package-lock.json`，不混用 yarn / pnpm。
- **依赖原则**：只引入实现当前功能所需的依赖，不随意添加冗余包。
- **核心依赖**（以 `design.md` §2 为准）：`@mozilla/readability`、`turndown` + `turndown-plugin-gfm`、`dompurify`、`openai`、`md-wx`、`@crxjs/vite-plugin`、`react` 等。
- **脚本约定**：`npm run dev`（开发构建）、`npm run build`（生产构建）、`npm run lint`（检查）、`npm run format`（格式化）。

## 4. 项目目录结构规范

遵循 `design.md` §9 定义的结构，核心约束如下：

```
src/
├── background/   # 后台 Service Worker：消息路由、翻译调用、存储
├── content/      # 内容脚本：文章提取与 Markdown 转换
├── popup/        # 弹窗 UI（React）：交互、打字机展示、md-wx 渲染
└── shared/       # 跨层共享：类型、常量、消息协议
```

- `src/shared/` 只存放**无副作用**的类型、常量与协议定义。
- `background` / `content` / `popup` 是三个独立运行上下文，**不得直接 import 对方内部实现**，只能通过 `shared` 与 `chrome.runtime` 消息通信。
- 提取、翻译、展示三大能力分别落在 `content/extractor`、`background/translator`、`popup/hooks`，职责单一、可替换。

## 5. 模块边界与通信规范

- **消息协议**：所有跨层消息的消息名、请求/响应类型统一定义在 `src/shared/`，新增消息须先在协议层登记，不得在调用处临时拼凑消息名。
- **存储**：统一通过 `chrome.storage.local`，存储键集中在 `src/shared/constants.ts`；数据键仅 `lastResult` 与 `settings`，不新增历史记录类存储。
- **配置读取**：API 地址 / Key / 模型统一从 `settings` 读取，不得散落在各层硬编码。

## 6. 安全与隐私原则

- **最小权限**：Manifest 仅申请必要权限（`storage`、`activeTab`、`scripting` 及 API 主机访问）。
- **净化**：所有从页面提取的 HTML 先经 `dompurify` 净化，再转 Markdown。
- **密钥安全**：API Key 仅存本地、仅随翻译请求发送至对应端点，日志不输出密钥。
- **数据最小化**：不采集历史记录、不额外上传用户数据。

## 7. AI 助手任务执行规范

为确保开发过程有序可控，AI 必须严格遵循以下规范。

### 7.1 任务范围控制

- **严格按任务拆分执行**：必须严格按照 `docs/tasks.md` 中定义的任务范围执行，不得超出指定任务边界。
- **单一任务原则**：每次只执行一个明确指定的任务（如「任务 T1」「任务 T2」等），完成后等待用户确认再进行下一步。
- **禁止自动扩展**：不得基于架构文档或其他文档自行扩展任务范围；确需扩展时，先通知用户并获得确认。

### 7.2 任务指令格式

用户应以以下格式明确指定任务：

- **明确任务编号**：「请执行任务 Tn：[任务名称]」
- **范围限制**：「只完成 Tn 中列出的具体任务，不要超出范围」
- **停止指令**：「完成后等待我确认再进行下一步」

### 7.3 执行与验收标准

- **对照自检**：每个任务完成后，必须对照 `docs/tasks.md` 中该任务的「完成标准 / 可见效果」进行自检。
- **范围边界检查**：确保所有新建或修改的文件、代码都在指定任务范围内。
- **等待确认**：任务完成后，总结完成情况与自检结果，等待用户确认后再进行下一个任务。

### 7.4 异常处理

- **任务描述不清晰**：先询问具体范围，而不是自行决定。
- **依赖关系处理**：若当前任务依赖其他未完成的任务，明确说明依赖关系并等待用户指示。
- **超出范围的代码**：若发现已创建超出任务范围的代码，主动询问是否需要清理。
