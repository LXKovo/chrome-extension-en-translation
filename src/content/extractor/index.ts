/**
 * 提取链路：Readability 提取正文 → DOMPurify 净化 → 图片 URL 归一化 →
 * Turndown(+GFM) 转 Markdown，输出 { title, author, url, markdown }
 * （docs/design.md §4）。
 */
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ExtractResult } from '../../shared/types';
import { normalizeImages } from './image-normalizer';

/** Turndown 服务为全量单例：选项与 GFM 插件注册一次即可 */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '*',
  emDelimiter: '*',
  linkStyle: 'inlined',
});
turndownService.use(gfm);

/** Readability 解析结果与回退信息的最小聚合 */
interface ParsedArticle {
  content: string | null;
  title: string;
  byline: string;
}

/** 读取页面 `<meta>` 的 content，用于回退标题 / 作者 */
function metaContent(doc: Document, selector: string): string {
  return doc.querySelector(selector)?.getAttribute('content')?.trim() || '';
}

/** 回退标题：部分站点 Readability 给不出标题，退回 og:title / 网页标题 */
function resolveTitle(doc: Document, readabilityTitle: string | null | undefined): string {
  return (
    readabilityTitle?.trim() ||
    metaContent(doc, 'meta[property="og:title"]') ||
    metaContent(doc, 'meta[name="twitter:title"]') ||
    doc.title.trim()
  );
}

/** 回退作者：Readability 未识别时尝试常见作者 meta */
function resolveAuthor(doc: Document, readabilityByline: string | null | undefined): string {
  return (
    readabilityByline?.trim() ||
    metaContent(doc, 'meta[name="author"]') ||
    metaContent(doc, 'meta[property="article:author"]')
  );
}

/**
 * 单次解析：优先 Readability，失败时回退到 <article> / <main> 语义标签。
 * parse() 会修改传入文档，故此处传入克隆以避免影响真实页面。
 */
function parseArticle(doc: Document): ParsedArticle {
  const readability = new Readability(doc.cloneNode(true) as Document).parse();
  if (readability?.content) {
    return {
      content: readability.content,
      title: resolveTitle(doc, readability.title),
      byline: resolveAuthor(doc, readability.byline),
    };
  }
  const semanticRoot = doc.querySelector('article') || doc.querySelector('main');
  return {
    content: semanticRoot?.innerHTML ?? null,
    title: resolveTitle(doc, null),
    byline: resolveAuthor(doc, null),
  };
}

/**
 * 从页面 DOM 提取结构化 Markdown。
 * 返回 null 表示未能识别到正文（docs/design.md §4.3）。
 */
export function extractArticle(doc: Document): ExtractResult | null {
  const { content: rawContent, title, byline } = parseArticle(doc);
  if (!rawContent) {
    console.warn(
      '[extractor] 未能提取到正文：Readability 与 <article>/<main> 语义标签均未解析出内容',
    );
    return null;
  }

  // 净化后再转 Markdown，防止恶意页面注入脚本（docs/design.md §6）
  const cleanHtml = DOMPurify.sanitize(rawContent);

  const container = doc.createElement('div');
  container.innerHTML = cleanHtml;
  normalizeImages(container, doc.baseURI || doc.URL);

  const markdown = turndownService.turndown(container);
  if (!markdown.trim()) {
    console.warn(
      '[extractor] 提取失败：页面结构被解析出内容，但转 Markdown 后为空（可能正文过少或纯空白/纯脚本）',
    );
    return null;
  }

  return { title, author: byline, url: doc.URL, markdown };
}
