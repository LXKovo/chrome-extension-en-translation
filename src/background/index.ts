/**
 * 后台 Service Worker 入口（docs/design.md §5 / §8）。
 * 职责：消息路由（停止翻译）+ 翻译 Port 长连接，将 OpenAI 流式增量推送给 Popup。
 * 翻译客户端集中在 ./translator，存储读取在 ./storage，各模块职责单一。
 */
import {
  MESSAGE_STOP_TRANSLATE,
  MESSAGE_TRANSLATE_REQUEST,
  PORT_TRANSLATE_STREAM,
  STREAM_EVENT_CHUNK,
  STREAM_EVENT_DONE,
  STREAM_EVENT_ERROR,
} from '../shared/constants';
import type { MessageRequest, StreamEvent, TranslateRequest } from '../shared/message';
import { readSettings } from './storage';
import { streamTranslate } from './translator';

/** 当前翻译流的中止控制器：用于「停止翻译」「Popup 断开」时中断底层请求 */
let currentAbortController: AbortController | null = null;

/** 消息路由：处理「停止翻译」请求 */
chrome.runtime.onMessage.addListener((request: MessageRequest, _sender, sendResponse) => {
  if (request.type !== MESSAGE_STOP_TRANSLATE) {
    return false;
  }
  currentAbortController?.abort();
  currentAbortController = null;
  sendResponse({ ok: true, data: null });
  return false;
});

/** 翻译 Port 长连接：接收翻译请求，流式推送增量 / 完成 / 错误事件 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_TRANSLATE_STREAM) {
    return;
  }

  port.onMessage.addListener((request: TranslateRequest) => {
    if (request.type !== MESSAGE_TRANSLATE_REQUEST) {
      return;
    }
    void runTranslation(port, request.markdown);
  });

  // Popup 刷新或关闭时中断当前流，避免残留请求
  port.onDisconnect.addListener(() => {
    currentAbortController?.abort();
    currentAbortController = null;
  });
});

/** 读取配置并启动流式翻译，将增量通过 Port 推送到 Popup */
async function runTranslation(port: chrome.runtime.Port, markdown: string): Promise<void> {
  // 为每次翻译单独建立中止控制器，保证可精确中断当前流
  const controller = new AbortController();
  currentAbortController = controller;

  try {
    if (!markdown.trim()) {
      throw new Error('翻译内容为空');
    }
    const settings = await readSettings();
    if (!settings.apiKey) {
      throw new Error('未配置 API Key，请先在设置页填写后重试');
    }

    await streamTranslate(
      settings,
      markdown,
      {
        onDelta: (delta: string) => post(port, { type: STREAM_EVENT_CHUNK, delta }),
        onDone: () => post(port, { type: STREAM_EVENT_DONE }),
        onError: (error: Error) => post(port, { type: STREAM_EVENT_ERROR, error: error.message }),
      },
      controller.signal,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '翻译失败';
    post(port, { type: STREAM_EVENT_ERROR, error: message });
  }
}

/** 向 Port 推送事件（连接已断开时静默丢弃，避免抛出未捕获异常） */
function post(port: chrome.runtime.Port, event: StreamEvent): void {
  try {
    port.postMessage(event);
  } catch {
    // Popup 已关闭导致 Port 失效，忽略本次推送
  }
}
