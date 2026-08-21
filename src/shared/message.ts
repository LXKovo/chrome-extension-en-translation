/**
 * 消息协议封装：统一定义跨层消息的请求 / 响应类型。
 * 新增消息须先在此登记，不得在调用处临时拼凑消息名（docs/design.md §10.3）。
 * 流式翻译基于 chrome.runtime.connect 的 Port 长连接，相关类型见「Port 翻译流协议」一节。
 */
import {
  MESSAGE_EXTRACT_ARTICLE,
  MESSAGE_STOP_TRANSLATE,
  MESSAGE_TRANSLATE_REQUEST,
  PORT_TRANSLATE_STREAM,
  STREAM_EVENT_CHUNK,
  STREAM_EVENT_DONE,
  STREAM_EVENT_ERROR,
} from './constants';
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

/**
 * Port 翻译流协议（docs/design.md §5.2）。
 * Popup 以 chrome.runtime.connect({ name: PORT_TRANSLATE_STREAM }) 建立长连接，
 * 先发送 TranslateRequest，Background 读取 settings 开启流式翻译并回推 StreamEvent。
 */

/** Port 通道名（与 constants.ts 保持一致，供类型引用） */
export const PORT_NAME_TRANSLATE_STREAM = PORT_TRANSLATE_STREAM;

/** 翻译请求：经 Port 发送给 Background，携带 Markdown 原文与用户当前选中的模型 */
export interface TranslateRequest {
  type: typeof MESSAGE_TRANSLATE_REQUEST;
  markdown: string;
  /** 主页面选中的模型；为空时后台回退到 settings.model */
  model?: string;
}

/** Port 上承载的请求消息联合类型 */
export type PortRequest = TranslateRequest;

/** 流式增量事件 */
export interface StreamChunkEvent {
  type: typeof STREAM_EVENT_CHUNK;
  delta: string;
}

/** 流结束事件 */
export interface StreamDoneEvent {
  type: typeof STREAM_EVENT_DONE;
}

/** 流错误事件 */
export interface StreamErrorEvent {
  type: typeof STREAM_EVENT_ERROR;
  error: string;
}

/** Background → Popup 的流式事件联合类型 */
export type StreamEvent = StreamChunkEvent | StreamDoneEvent | StreamErrorEvent;

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

/** 提取文章响应（成功携带数据，失败携带错误信息） */
export type ExtractArticleResponse = OkResponse<ExtractResult> | ErrorResponse;

/** 所有跨层消息响应的联合类型 */
export type MessageResponse = ExtractArticleResponse | ErrorResponse;
