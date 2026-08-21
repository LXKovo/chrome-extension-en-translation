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
  baseURL: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-v4-flash',
};

/** 模型选项（设置页「默认模型」下拉 / 主页面操作区模型下拉） */
export const MODEL_OPTIONS: ModelOption[] = [
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
  { value: 'qwen-turbo', label: 'qwen-turbo' },
  { value: 'qwen-plus', label: 'qwen-plus' },
  { value: 'qwen-max', label: 'qwen-max' },
  { value: 'qwen-long', label: 'qwen-long' },
];
