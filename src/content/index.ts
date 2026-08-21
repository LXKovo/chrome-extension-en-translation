/**
 * 内容脚本入口：监听提取文章消息并返回结构化 Markdown（docs/design.md §4 / §8）。
 * 提取逻辑集中于 ./extractor，职责单一、可替换。
 */
import { MESSAGE_EXTRACT_ARTICLE } from '../shared/constants';
import type {
  ErrorResponse,
  ExtractArticleResponse,
  MessageRequest,
  MessageResponse,
} from '../shared/message';
import { extractArticle } from './extractor';

/** 提取失败/无法识别正文时给出可读提示 */
function toResponse(error: unknown): ErrorResponse {
  return { ok: false, error: error instanceof Error ? error.message : '提取失败' };
}

chrome.runtime.onMessage.addListener(
  (request: MessageRequest, _sender, sendResponse: (response: MessageResponse) => void) => {
    if (request.type !== MESSAGE_EXTRACT_ARTICLE) {
      return false;
    }

    let response: ExtractArticleResponse;
    console.log('[content] 收到提取请求，url=', location.href);
    try {
      const result = extractArticle(document);
      if (result) {
        console.log('[content] 提取成功', {
          title: result.title,
          author: result.author,
          markdownLength: result.markdown.length,
        });
        response = { ok: true, data: result };
      } else {
        console.warn(
          '[content] 提取失败：未能识别到正文（readability/semantic 均无内容或转 Markdown 后为空）',
        );
        response = { ok: false, error: '无法识别当前页面的正文，请切换至可阅读的英文文章再试' };
      }
    } catch (error) {
      console.warn('[content] 提取异常', error);
      response = toResponse(error);
    }

    // 提取为同步操作，直接返回结果，无需保持消息通道
    sendResponse(response);
    return false;
  },
);
