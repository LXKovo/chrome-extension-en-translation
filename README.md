# 英文网页翻译

一个 Chrome 浏览器扩展（Manifest V3）：一键提取英文网页正文，调用大语言模型翻译为中文，并以 Markdown 格式导出。

## 功能特性

- **智能正文提取**：自动过滤导航栏、侧边栏、广告、评论等噪音，提取标题、作者与正文核心内容（基于 Readability 语义分析）。
- **Markdown 转换**：正文转换为结构清晰的 Markdown，保留标题层级、列表、引用、代码块，图片以 `![alt](src)` 语法保留。
- **大模型翻译**：通过 OpenAI 兼容协议调用你自选的模型服务（DeepSeek / 通义千问等），将标题与正文整体译为中文，保持 Markdown 结构不变。
- **打字机效果**：翻译结果逐字动态展示，可随时停止。
- **一键下载**：翻译结果可导出为 `.md` 文件，文件名自动使用文章标题。
- **最近结果持久化**：本地保存最近一次翻译结果，重开插件即可查看或下载。

## 运行环境

- Chrome 或基于 Chromium 内核的浏览器（Edge、Brave 等）。
- 需要自行提供大模型服务的 API 地址与 Key。

## 快速开始

### 1. 构建

```bash
npm install
npm run build
```

构建产物输出到 `dist/` 目录。

### 2. 加载扩展

1. 打开 Chrome，访问 `chrome://extensions`。
2. 开启右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目的 `dist/` 目录。
4. 点击工具栏中的插件图标即可使用。

> 开发调试可使用 `npm run dev` 启动监听构建（产物仍输出到 `dist/`，修改源码后需在扩展页点击刷新）。

## 使用说明

1. 打开任意英文文章页面（如 Medium、技术博客、新闻站）。
2. 点击工具栏的插件图标，在弹窗中点击「一键翻译」。
3. 插件依次执行：提取正文 → 交给后台流式翻译 → 逐字展示结果。
4. 翻译完成后可点击「下载」导出 `.md` 文件；关闭弹窗后再打开仍可查看上次结果。

输出统一格式：

```markdown
# [翻译后的文章标题]

> **作者**：[作者名]
> **原文链接**：[原始文章URL]

[翻译后的正文]
```

## 配置说明

点击弹窗右上角「⚙️ 设置」可配置：

| 配置项   | 说明                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| API 地址 | OpenAI 兼容端点地址。默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`（通义千问） |
| API Key  | 你的模型服务密钥，仅保存在本地浏览器                                                      |
| 默认模型 | 翻译使用的模型。支持 `deepseek-v4-flash` / `deepseek-v4-pro` / `qwen3.7-flash`            |

- 切换模型时会自动将 API 地址匹配到对应厂商的推荐端点；若使用私有部署/代理地址，请手动填写。
- API Key 仅存储于 `chrome.storage.local`，只随翻译请求发送至对应端点，不上传任何额外数据。

## 技术栈

- **语言**：TypeScript（严格模式）
- **UI**：React 18（函数组件 + Hooks）
- **构建**：Vite + `@crxjs/vite-plugin`（MV3 多入口打包）
- **Markdown 渲染**：`md-wx`
- **正文提取**：`@mozilla/readability` + `dompurify` + `turndown`(GFM)
- **翻译**：`openai` SDK（OpenAI 兼容协议，可配置 `baseURL` 与 `model`）

## 目录结构

```text
src/
├── background/   # 后台 Service Worker：消息路由、流式翻译调用、存储读取
│   └── translator/   # OpenAI 兼容翻译客户端
├── content/      # 内容脚本：文章提取与 Markdown 转换
│   └── extractor/    # 提取链路（Readability → 净化 → 图片归一化 → Turndown）
├── popup/        # 弹窗 UI（React）：主视图 / 设置视图、打字机展示、md-wx 渲染
│   ├── components/
│   └── hooks/
└── shared/       # 跨层共享：类型、常量、消息协议
```

三个运行上下文（background / content / popup）相互独立，仅通过 `src/shared/` 与 `chrome.runtime` 消息通信。

## 开发命令

| 命令                | 说明                     |
| ------------------- | ------------------------ |
| `npm run dev`       | 开发构建（监听模式）     |
| `npm run build`     | 生产构建，输出到 `dist/` |
| `npm run typecheck` | TypeScript 类型检查      |
| `npm run lint`      | ESLint 检查              |
| `npm run format`    | Prettier 格式化          |

## 隐私与安全

- 最小权限：仅申请 `storage`、`activeTab`、`scripting` 及 API 主机访问权限。
- 所有从页面提取的 HTML 先经 DOMPurify 净化，再转 Markdown。
- 不采集历史记录、不上传额外用户数据；API Key 仅本地保存。

## 文档

- [需求文档](docs/proposal.md)
- [技术架构](docs/design.md)
- [任务拆分](docs/tasks.md)

## 许可证

[MIT](LICENSE)
