/**
 * OpenAI 兼容翻译客户端（流式，docs/design.md §5）。
 * 通过配置 baseURL / model / apiKey 即可在 DeepSeek、通义千问等兼容端点间切换，
 * 业务层不关心具体模型提供商。
 */
import OpenAI, { APIError } from 'openai';
import type { Settings } from '../../shared/types';

/** 流式翻译回调：增量 / 完成 / 错误 */
export interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/** 系统提示：约束翻译行为，保证 Markdown 结构与图片语法不被破坏 */
const SYSTEM_PROMPT = [
  '你是一名专业的文章翻译助手，擅长将英文技术文章翻译为通顺、准确的中文。',
  '请遵循以下规则：',
  '1. 将标题与正文整体翻译为中文，术语可保留原文并在首次出现处附注。',
  '2. 严格保持原文的 Markdown 结构不变：标题层级、段落、列表、引用、代码块、表格等原样保留。',
  '3. 图片语法 ![alt](src) 原样保留，不对其做任何翻译或改动。',
  '4. 仅输出翻译后的中文 Markdown，不要输出任何额外说明文字。',
].join('\n');

/**
 * 将底层 SDK / 网络错误映射为面向用户的可读中文文案（docs/design.md §10.4）。
 * 覆盖鉴权失败、额度不足、网络错误等常见失败场景，避免直接暴露英文技术信息。
 */
function toReadableError(error: unknown): string {
  if (error instanceof APIError) {
    const code = typeof error.code === 'string' ? error.code.toLowerCase() : '';
    const status = error.status;
    if (status === 401 || code.includes('invalid_api_key') || code.includes('auth')) {
      return '鉴权失败：API Key 无效或已过期，请到设置页检查后重试';
    }
    if (status === 429 || code.includes('insufficient_quota') || code.includes('rate_limit')) {
      return '额度不足或请求过于频繁：请检查账户余额或稍后重试';
    }
    if (status === 400) {
      return '请求不合法：请检查模型名称与翻译内容（正文可能过长或模型不支持）';
    }
    return `模型服务错误（${status}）：${error.message}`;
  }

  const message = error instanceof Error ? error.message : '翻译请求失败';
  if (/failed to fetch|network|econnreset|econnrefused|enotfound|timeout|aborted/i.test(message)) {
    return '网络错误：无法连接模型服务，请检查 API 地址与网络连接';
  }
  return message;
}

/**
 * 以流式方式调用 OpenAI 兼容接口翻译 Markdown 原文。
 * abort 可选：传入即可支持「停止翻译」中断底层请求（docs/design.md §5.2 / §6）。
 */
export async function streamTranslate(
  settings: Settings,
  markdown: string,
  callbacks: StreamCallbacks,
  abort?: AbortSignal,
): Promise<void> {
  const client = new OpenAI({
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
  });

  try {
    const stream = await client.chat.completions.create(
      {
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: markdown },
        ],
        stream: true,
      },
      // 仅在必要时透传中止信号，让底层请求可被取消
      { signal: abort },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        callbacks.onDelta(delta);
      }
    }

    callbacks.onDone();
  } catch (error) {
    // 主动取消时终止容器选择，避免上层将其当作真实错误；其余错误映射为可读文案上报
    if (abort?.aborted) {
      return;
    }
    callbacks.onError(new Error(toReadableError(error)));
  }
}
