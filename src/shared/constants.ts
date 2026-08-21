/**
 * 跨层共享常量：消息名、存储键、默认配置、模型选项。
 * 存储键集中于 chrome.storage.local，仅 lastResult 与 settings 两个键（docs/design.md §7）。
 */
import type { ModelOption, Settings } from './types';

/** 存储键：最近一次翻译结果 */
export const STORAGE_KEY_LAST_RESULT = 'lastResult' as const;

/** 存储键：用户配置 */
export const STORAGE_KEY_SETTINGS = 'settings' as const;

/** 消息名：请求提取当前页面文章 */
export const MESSAGE_EXTRACT_ARTICLE = 'extract-article' as const;

/** 消息名：停止流式翻译 */
export const MESSAGE_STOP_TRANSLATE = 'stop-translate' as const;

/** Port 消息名：发起流式翻译（携带 Markdown 原文） */
export const MESSAGE_TRANSLATE_REQUEST = 'translate-request' as const;

/** Port 通道名：翻译流式增量推送 */
export const PORT_TRANSLATE_STREAM = 'translate-stream' as const;

/** Port 事件：流式增量 */
export const STREAM_EVENT_CHUNK = 'chunk' as const;

/** Port 事件：流结束 */
export const STREAM_EVENT_DONE = 'done' as const;

/** Port 事件：流错误 */
export const STREAM_EVENT_ERROR = 'error' as const;

/** 默认配置（docs/proposal.md §4.3、docs/design.md §5.4） */
export const DEFAULT_SETTINGS: Settings = {
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: '',
  model: 'qwen3.7-flash',
};

/**
 * 模型前缀 → 推荐 baseURL 映射。
 * 不同厂商（DeepSeek / 通义千问 DashScope）的兼容端点不同，若用户切换了模型但忘记改 API 地址，
 * 会直接打到错误端点导致「正在翻译但一直无结果/无错误提示」。
 * 后台在翻译前会据此进行一次兼容校正；设置页切换模型时若 baseURL 仍为旧厂商默认值也会同步更新。
 */
export const MODEL_VENDOR_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

/** 按模型前缀匹配推荐 baseURL（未命中时返回 undefined，交由调用方回退） */
export function resolveVendorBaseURL(modelName: string): string | undefined {
  const lower = modelName.toLowerCase();
  for (const prefix of Object.keys(MODEL_VENDOR_BASE_URLS)) {
    if (lower.startsWith(prefix)) {
      return MODEL_VENDOR_BASE_URLS[prefix];
    }
  }
  return undefined;
}

/** 模型选项（设置页「默认模型」下拉 / 主页面操作区模型下拉） */
export const MODEL_OPTIONS: ModelOption[] = [
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
  { value: 'qwen3.7-flash', label: 'qwen3.7-flash' },
];
