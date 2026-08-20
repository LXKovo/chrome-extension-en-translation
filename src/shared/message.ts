/**
 * 消息协议封装：统一定义跨层消息的请求 / 响应类型。
 * 新增消息须先在此登记，不得在调用处临时拼凑消息名（docs/design.md §10.3）。
 * 流式翻译基于 chrome.runtime.connect 的 Port 长连接，其事件名见 constants.ts。
 */
import { MESSAGE_EXTRACT_ARTICLE, MESSAGE_STOP_TRANSLATE } from './constants';
import type { ExtractResult } from './types';

/** 提取文章请求（作用于当前标签页，无需参数） */
export interface ExtractArticleRequest {
  type: typeof MESSAGE_EXTRACT_ARTICLE;
}

/** 停止翻译请求 */
export interface StopTranslateRequest {
  type: typeof MESSAGE_STOP_TRANSLATE;
}

/** 所有跨层消息请求的联合类型 */
export type MessageRequest = ExtractArticleRequest | StopTranslateRequest;

/** 通用成功响应（携带数据） */
export interface OkResponse<T> {
  ok: true;
  data: T;
}

/** 通用失败响应 */
export interface ErrorResponse {
  ok: false;
  error: string;
}

/** 提取文章响应 */
export type ExtractArticleResponse = OkResponse<ExtractResult>;

/** 所有跨层消息响应的联合类型 */
export type MessageResponse = ExtractArticleResponse | ErrorResponse;
