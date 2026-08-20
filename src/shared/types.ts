/**
 * 跨层共享类型定义。
 * 仅存放无副作用的数据类型，供 background / content / popup 共同使用（docs/design.md §10.3）。
 */

/** 用户配置（OpenAI 兼容接口），存储于 chrome.storage.local 的 settings 键 */
export interface Settings {
  /** OpenAI 兼容端点地址 */
  baseURL: string;
  /** 用户 API Key */
  apiKey: string;
  /** 选中的模型名 */
  model: string;
}

/** 文章提取结果（Content Script 返回） */
export interface ExtractResult {
  title: string;
  author: string;
  url: string;
  markdown: string;
}

/** 最近一次翻译结果（含元数据），存储于 chrome.storage.local 的 lastResult 键 */
export interface LastResult {
  title: string;
  author: string;
  url: string;
  markdown: string;
  /** 翻译完成时间戳（毫秒） */
  timestamp: number;
}

/** 模型选项（设置页 / 主页面下拉） */
export interface ModelOption {
  value: string;
  label: string;
}

/** 流式翻译增量（Background → Popup，通过 Port 推送） */
export interface TranslateChunk {
  delta: string;
}
