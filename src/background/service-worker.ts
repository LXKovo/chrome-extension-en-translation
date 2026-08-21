/**
 * 后台 Service Worker 入口（docs/design.md §5 / §8）。
 * 职责：消息路由（停止翻译）+ 翻译 Port 长连接，将 OpenAI 流式增量推送给 Popup。
 * 翻译客户端集中在 ./translator，存储读取在 ./storage，各模块职责单一。
 */
import {
  MESSAGE_STOP_TRANSLATE,
  MESSAGE_TRANSLATE_REQUEST,
  MODEL_VENDOR_BASE_URLS,
  PORT_TRANSLATE_STREAM,
  resolveVendorBaseURL,
  STREAM_EVENT_CHUNK,
  STREAM_EVENT_DONE,
  STREAM_EVENT_ERROR,
} from '../shared/constants';
import type { MessageRequest, StreamEvent, TranslateRequest } from '../shared/message';
import { readSettings } from './storage';
import { streamTranslate } from './translator';

/**
 * 翻译前校正 baseURL：切换了模型厂商却未同步修改 API 地址是「无结果」的常见诱因。
 * 仅在「当前 baseURL 属于已知厂商默认值、且与所选模型不匹配」时才覆盖为推荐地址；
 * 用户自定的代理/中转地址（非默认值）不做改动，避免破坏私有部署。
 */
function adjustBaseURLForModel(
  baseURL: string,
  model: string,
): { baseURL: string; adjusted: boolean } {
  const recommended = resolveVendorBaseURL(model);
  if (!recommended) {
    return { baseURL, adjusted: false };
  }
  // 当前地址已经是该模型推荐的地址，无需处理
  const normalized = baseURL.replace(/\/+$/, '');
  const normalizedRecommended = recommended.replace(/\/+$/, '');
  if (normalized === normalizedRecommended) {
    return { baseURL, adjusted: false };
  }
  // 当前地址属于其它已知厂商的默认值 → 典型的「切了模型没改地址」，自动改到推荐地址
  const knownDefaults = new Set(
    Object.values(MODEL_VENDOR_BASE_URLS).map((v) => v.replace(/\/+$/, '')),
  );
  if (knownDefaults.has(normalized)) {
    console.warn(
      `[background] 检测到 baseURL=${baseURL} 与模型=${model} 分属不同厂商，已自动校正为推荐地址=${recommended}；若你使用私有部署请在设置页填写自定义地址`,
    );
    return { baseURL: recommended, adjusted: true };
  }
  return { baseURL, adjusted: false };
}

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
    void runTranslation(port, request);
  });

  // Popup 刷新或关闭时中断当前流，避免残留请求
  port.onDisconnect.addListener(() => {
    currentAbortController?.abort();
    currentAbortController = null;
  });
});

/** 读取配置并启动流式翻译，将增量通过 Port 推送到 Popup */
async function runTranslation(port: chrome.runtime.Port, request: TranslateRequest): Promise<void> {
  // 为每次翻译单独建立中止控制器，保证可精确中断当前流
  const controller = new AbortController();
  currentAbortController = controller;

  try {
    if (!request.markdown.trim()) {
      throw new Error('翻译内容为空');
    }
    const settings = await readSettings();
    if (!settings.apiKey) {
      throw new Error('未配置 API Key，请先在设置页填写后重试');
    }
    // 优先使用主页面选中的模型，未指定时回退到设置页「默认模型」
    const effectiveSettings = request.model ? { ...settings, model: request.model } : settings;

    // 关键健壮性补充：防止 qwen/deepseek 模型与 API 地址不匹配导致请求一直无响应/400
    const adjusted = adjustBaseURLForModel(effectiveSettings.baseURL, effectiveSettings.model);
    effectiveSettings.baseURL = adjusted.baseURL;

    // 关键节点：翻译请求启动前打印最终生效配置（仅记录 baseURL 域名与模型，绝不打印 API Key）
    console.log(
      `[background] 准备调用翻译：model=${effectiveSettings.model}，baseURL=${effectiveSettings.baseURL}，原文=${request.markdown.length} 字符`,
    );

    await streamTranslate(
      effectiveSettings,
      request.markdown,
      {
        onDelta: (delta: string) => post(port, { type: STREAM_EVENT_CHUNK, delta }),
        onDone: () => {
          console.log('[background] 流式翻译正常完成，推送 DONE');
          post(port, { type: STREAM_EVENT_DONE });
        },
        onError: (error: Error) => {
          console.warn('[background] 流式翻译报错，准备推送 ERROR：', error.message);
          post(port, { type: STREAM_EVENT_ERROR, error: error.message });
        },
      },
      controller.signal,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '翻译失败';
    console.warn('[background] runTranslation 顶层捕获异常，推送 ERROR：', message);
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
