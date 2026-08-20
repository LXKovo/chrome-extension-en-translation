# 英文网页翻译 Chrome 插件 — 技术架构设计文档

> 本文档为《需求文档》（`docs/proposal.md`）对应的技术架构设计，仅描述架构方案、技术选型、模块划分与规范，**不包含代码实现**。

## 1. 文档目的与范围

本文档定义插件的技术架构，作为后续编码实现的依据，覆盖以下内容：

- 技术选型（含内容提取方案调研结论）
- 系统整体架构与模块划分
- 关键流程与数据流
- 目录结构规范
- 编码规范
- 关键技术难点与应对方案
- 安全与隐私设计

## 2. 技术选型总览

| 关注点 | 选型 | 说明 |
| --- | --- | --- |
| 插件平台 | **Manifest V3 (MV3)** | Chrome 现行插件规范，Service Worker 化、权限最小化 |
| 前端框架 | **React 19 + TypeScript** | 组件化 UI，TS 提供强类型保障 |
| 构建工具 | **Vite**（配合 `@crxjs/vite-plugin` 或等价插件） | 快速构建、HMR、多入口（content/popup/background）打包 |
| 内容提取 | **`@mozilla/readability`** | 文章主体提取（详见 §4） |
| HTML → Markdown | **`turndown` + `turndown-plugin-gfm`** | 结构化的 HTML 转 Markdown，GFM 插件支持表格、删除线等 |
| 安全净化 | **`dompurify`** | 提取出的 HTML 在转 Markdown 前先做 XSS 净化 |
| 翻译调用 | **OpenAI 兼容 SDK**（`openai` 官方 SDK，可配置 `baseURL`） | 通过切换 `baseURL` + `model` 即可切换模型提供商 |
| 默认模型 | `deepseek-v4-flash` | 候选：`deepseek-v4-flash`、`deepseek-v4-pro`、`qwen` |
| 结果渲染 | **`md-wx`（`MarkdownRenderer`）** | 微信优化的 Markdown 渲染组件，多主题、代码高亮、复制 |
| 本地存储 | **`chrome.storage.local`** | 保存最近一次翻译结果 + 用户配置 |
| 代码检查 | **ESLint**（`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`） | 静态检查、规范约束、Hooks 规则 |
| 代码格式化 | **Prettier** | 统一代码风格与自动格式化 |
| 提交规范 | **husky + lint-staged + commitlint** | 提交前自动检查/格式化，提交信息规范化 |

## 3. 系统整体架构

插件采用 MV3 的三层结构：**内容脚本（Content Script）** 负责提取，**后台 Service Worker** 负责翻译调用与消息路由，**弹窗（Popup，React UI）** 负责交互与结果展示。

```text
┌─────────────────────────────────────────────────────────────┐
│                       当前网页 (Web Page)                       │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐     │
│   │  Content Script（内容脚本，运行于隔离环境）              │     │
│   │    · 读取页面 DOM                                      │     │
│   │    · Readability 提取正文 → DOMPurify 净化              │     │
│   │    · 图片 URL 归一化 → Turndown 转 Markdown             │     │
│   └───────────────────────┬─────────────────────────────┘     │
└───────────────────────────┼───────────────────────────────────┘
                            │  chrome.runtime 消息
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Service Worker（后台）                  │
│   · 消息路由（Popup ↔ Content Script）                         │
│   · OpenAI 兼容翻译调用（streaming，携带 API Key）             │
│   · 读取/写入 chrome.storage.local                            │
└───────────────┬───────────────────────────┬───────────────────┘
                │  Port 消息（流式增量）       │  chrome.storage.local
                ▼                           ▼
┌───────────────────────────────┐   ┌──────────────────────────┐
│  Popup（React UI，md-wx 渲染）  │   │  chrome.storage.local     │
│   · 触发提取 / 选择模型          │   │   · lastResult（最近一次） │
│   · 打字机逐字缓冲区            │   │   · settings（配置）       │
│   · <MarkdownRenderer/>       │   └──────────────────────────┘
└───────────────────────────────┘
```

### 3.1 各层职责

| 层 | 职责 | 说明 |
| --- | --- | --- |
| Content Script | 文章提取 | 唯一能访问页面 DOM 的层，运行在隔离世界，负责提取与 Markdown 转换 |
| Background | 翻译调用、消息路由 | 持有 API Key 发起翻译；因 Service Worker 不受页面 CORS 限制，可稳定调用第三方 API |
| Popup | 交互与展示 | React 页面，负责用户操作、打字机展示、md-wx 渲染 |

## 4. 内容提取方案（关键与难点）

内容提取是本插件的核心难点：不同站点的 DOM 结构、广告/导航/侧栏噪音、图片懒加载、Shadow DOM 等差异很大。经调研，确定以下方案。

### 4.1 方案选型结论

采用 **Mozilla `@mozilla/readability`** 作为正文提取引擎。理由：

- 它是 **Firefox 阅读模式（Reader View）同源算法**，久经大规模生产验证，成熟稳定。
- 能有效去除广告、导航、侧栏等噪音，保留标题、段落、列表、引用、代码块、图片等语义结构。
- 社区在 Chrome 插件中广泛采用（如 Gloriosa、Summa、Markdown Clipper 等），生态成熟。
- 提供 `isProbablyReaderable()` 预判能力，可快速判断页面是否适合提取。

配套链路：

```text
页面 DOM
  → Readability.parse()           提取标题 / 作者 / 正文 HTML
  → DOMPurify.sanitize()          净化，防 XSS
  → 图片 URL 归一化                相对路径→绝对路径；识别懒加载 src
  → Turndown(+GFM).turndown()     HTML → Markdown（图片转 ![alt](src)）
  → 输出 { title, author, url, markdown }
```

### 4.2 图片处理策略

- 将 `<img>` 转换为 `![alt](src)`：
  - `alt` 优先取图片 `alt` 属性，缺失时使用占位文本。
  - `src` 需归一化为**绝对 URL**（解析相对路径）。
- 处理常见**懒加载**：优先识别 `data-src` / `data-original` / `data-lazy-src` 等属性与 `srcset` 中的高分辨率地址。
- 过滤明显无关的小图标（如站点 logo、头像、点赞图标）可选作为后续优化项。

### 4.3 降级与容错

| 场景 | 策略 |
| --- | --- |
| `isProbablyReaderable()` 判定为否 | 回退到通用启发式：优先 `<article>` / `main` 语义标签，再回退 `og:title` / JSON-LD 元数据 |
| 解析失败或无正文 | 明确提示“无法识别正文”，不返回空结果 |
| 非英文页面 | 提示当前语言非英文，可由用户决定是否继续 |
| Shadow DOM / iframe 正文（如 Medium） | 记录为已知限制，作为后续优化项 |

## 5. 翻译方案（OpenAI 兼容）

### 5.1 统一接口

采用 **OpenAI 兼容协议**统一所有模型提供商的调用方式：

- 使用 `openai` 官方 SDK，通过配置 `baseURL` 指向不同提供商的兼容端点。
- 仅需切换 `baseURL` 与 `model` 即可在 DeepSeek、通义千问（DashScope 兼容端点）等之间切换，无需改动业务逻辑。
- 默认模型：`deepseek-v4-flash`；可选：`deepseek-v4-pro`、`qwen`。

### 5.2 流式输出

- 翻译请求开启流式（SSE），大模型按 token 增量返回，为打字机效果提供数据源。
- 采用 `chrome.runtime.connect` 长连接（Port）将增量从后台推送到 Popup。

### 5.3 翻译输入与输出契约

- **输入**：提取得到的 Markdown 原文（含 `# 标题` 与正文、图片语法）。
- **输出**：中文 Markdown，标题与正文均翻译为中文，图片语法、代码块、列表、引用等结构保持不变。
- **后处理**：在翻译结果基础上，由插件自身补全输出格式中的 `> 作者` 与 `> 原文链接` 两行（这两行来自提取元数据，不经过大模型），最终拼接为需求文档规定的统一格式。

### 5.4 配置项（存储于 chrome.storage.local）

| 配置 | 说明 |
| --- | --- |
| `baseURL` | OpenAI 兼容端点地址 |
| `apiKey` | 用户自己的 API Key |
| `model` | 选中的模型（默认 `deepseek-v4-flash`） |

> API Key 仅存于用户本地，仅随翻译请求发送至对应端点。

## 6. 打字机展示方案

- 大模型流式返回的 token 增量，先进入 Popup 内的**逐字缓冲区（字符队列）**。
- 以稳定速率逐字释放，逐步拼接为一个不断增长的 Markdown 字符串状态。
- 该字符串作为 `markdown` 属性传给 `md-wx` 的 `<MarkdownRenderer>`，实现“逐字”打字机效果。
- 用户可随时**停止**展示（终止缓冲并立即显示已生成内容，或中断流式连接）。

## 7. 本地持久化方案

- 存储位置：`chrome.storage.local`（本地，不上传、不同步）。
- 数据键：
  - `lastResult`：最近一次翻译结果（最终 Markdown 字符串 + `{ title, author, url, timestamp }` 元数据）。
  - `settings`：用户配置（`baseURL` / `apiKey` / `model`）。
- 打开 Popup 时默认加载 `lastResult`，满足“查看上次结果”的需求；**不维护历史列表**。

## 8. 关键流程

```text
用户点击工具栏图标
   │
   ▼
Popup 打开，加载 lastResult（若有）
   │
   ▼ 点击“提取并翻译”
Popup → Content Script（请求提取）
   │
   ▼
Content Script 提取并转 Markdown，返回 { title, author, url, markdown }
   │
   ▼
Popup 拼接头部，将正文 Markdown 交由 Background 翻译
   │
   ▼
Background 以流式调用 OpenAI 兼容接口
   │
   ▼  Port 逐增量推送
Popup 打字机逐字缓冲 → <MarkdownRenderer> 动态渲染
   │
   ▼ 流结束
Popup 拼接最终格式 → 写入 chrome.storage.local
```

## 9. 目录结构规范

```text
chrome-extension-en-translation/
├── docs/                          # 文档
│   ├── proposal.md                # 需求文档
│   └── design.md                  # 本文档
├── public/
│   ├── manifest.json              # MV3 清单（权限、入口声明）
│   └── icons/                     # 插件图标
├── src/
│   ├── background/                # 后台 Service Worker
│   │   ├── index.ts               # 入口：消息路由
│   │   ├── translator/            # OpenAI 兼容翻译客户端（流式）
│   │   └── storage.ts             # 存储读写封装
│   ├── content/                   # 内容脚本
│   │   ├── index.ts               # 入口：接收消息、返回提取结果
│   │   └── extractor/             # 提取链路（Readability + 图片归一化 + Turndown）
│   ├── popup/                     # 弹窗 UI（React）
│   │   ├── main.tsx               # React 挂载入口
│   │   ├── App.tsx                # 根组件
│   │   ├── components/            # 通用组件（模型选择、结果视图等）
│   │   ├── hooks/                 # 打字机缓冲、流式订阅等逻辑 Hook
│   │   └── styles/                # 样式
│   ├── shared/                    # 跨层共享
│   │   ├── types.ts               # 共享类型与消息协议定义
│   │   ├── constants.ts           # 常量（消息名、存储键、默认配置）
│   │   └── message.ts             # 消息协议封装
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts                 # 多入口构建配置
└── .eslintrc / .prettierrc        # 代码规范配置
```

**目录职责约定**：

- `src/shared/` 为跨层共享层，仅存放**无副作用**的类型、常量与协议定义，不依赖浏览器插件 API 的具体实现细节。
- `src/background/`、`src/content/`、`src/popup/` 为三个独立运行上下文，**不得相互直接 import 对方内部实现**，
  只能通过 `src/shared/` 与 `chrome.runtime` 消息通信。
- 提取、翻译、展示三大能力分别落在 `content/extractor`、`background/translator`、`popup/hooks`，职责单一、可替换。

## 10. 编码规范

### 10.1 语言与工具

- **TypeScript 严格模式**（`strict: true`），禁用 `any` 的显式使用（确需时须注释说明）。
- **ESLint**：静态检查与规范约束，采用 `typescript-eslint` 规则集 + `eslint-plugin-react-hooks`（保证 Hooks 依赖正确）。
- **Prettier**：统一代码格式（缩进、引号、分号、行宽等），提交前自动格式化。
- **husky + lint-staged**：Git 提交前对暂存文件自动执行 lint 与格式化。
- **commitlint**：约束提交信息格式（如 Conventional Commits）。

### 10.2 命名规范

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 文件/目录 | kebab-case | `message-protocol.ts`、`markdown-renderer/` |
| 组件 | PascalCase | `MarkdownView` |
| 函数/变量 | camelCase | `extractArticle`、`isStreaming` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEY_LAST_RESULT` |
| 类型/接口 | PascalCase（接口不加 `I` 前缀） | `ExtractResult`、`TranslateChunk` |
| 布尔变量 | `is` / `has` / `should` 前缀 | `isProbablyReaderable` |

### 10.3 结构规范

- 每个模块只做一件事，导出清晰的公共接口，内部实现细节不暴露。
- 共享类型集中在 `src/shared/types.ts`，避免类型在各层重复定义。
- 消息协议（消息名、请求/响应类型）统一定义在 `src/shared/message.ts`，新增消息须先在协议层登记。

### 10.4 其它约定

- 错误须被显式处理：第三方调用（提取、翻译、存储）必须 try/catch 并向用户给出可读提示，不静默失败。
- 异步一律使用 `async/await`；流式数据使用 Port/事件订阅，避免回调嵌套。
- 注释用于解释“为什么”，而非复述“做了什么”。

## 11. 安全与隐私设计

- **最小权限**：Manifest 中仅申请 `storage`、`activeTab`（或按需 `scripting`）及目标 API 主机的访问权限。
- **净化**：所有提取的 HTML 经 `dompurify` 处理后再转 Markdown，防止恶意页面注入。
- **密钥安全**：API Key 仅存储于本地 `chrome.storage.local`，仅随翻译请求发送至对应端点，日志不输出密钥。
- **数据最小化**：不采集、不存储历史记录，不额外上传用户数据。

## 12. 已知风险与后续优化

| 风险/限制 | 说明 | 应对 |
| --- | --- | --- |
| Service Worker 长流式调用可能被终止 | 超长文章的流式翻译可能触发 SW 生命周期回收 | 优先保持 Port 活跃；必要时引入 **offscreen document** 承载长任务 |
| Shadow DOM / iframe 正文 | 部分站点（如 Medium）正文在嵌套结构内 | 记录为限制，后续针对性处理 |
| 站点结构差异 | Readability 对个别站点提取质量有波动 | 保留降级启发式，必要时支持站点级规则扩展 |
| 第三方 API CORS | 直接由页面调用可能受 CORS 限制 | 由 Background 统一发起调用，规避页面 CORS |

## 13. 参考资料

- Mozilla Readability（GitHub）：<https://github.com/mozilla/readability>
- Readability 使用与选型分析：<https://vampireachao.github.io/2025/01/30/readability/>
- Markdown Clipper（Readability + Turndown 实践）：<https://github.com/mmstroik/markdown-clipper>
- Gloriosa（Readability + Turndown 转 Markdown 扩展）：<https://github.com/myakura/gloriosa>
- Summa（Readability + Turndown + LLM 摘要扩展）：<https://rustpoint.com/nav/detail/1103215>
- md-wx 组件使用文档：`docs/md-wx-api-usage.md`
