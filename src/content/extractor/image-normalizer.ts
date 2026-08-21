/**
 * 图片 URL 归一化：将 <img> 的相对路径 / 懒加载地址解析为绝对 URL，
 * 并在缺少 alt 时补占位文本，保证 Turndown 能输出 `![alt](src)`
 * （docs/design.md §4.2）。
 */

/** 常见的懒加载图片来源属性，按优先级依次尝试 */
const LAZY_SRC_ATTRIBUTES = ['data-src', 'data-original', 'data-lazy-src'] as const;

/** 数据 / binary 协议，无需也无法做相对路径解析 */
const NON_HTTP_PROTOCOL = /^(data|blob|javascript):/i;

/** 把候选 URL 解析为绝对地址；解析失败时原样返回 */
function toAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  if (NON_HTTP_PROTOCOL.test(rawUrl)) {
    return rawUrl;
  }
  try {
    return new URL(rawUrl, baseUrl).href;
  } catch {
    // 非法 URL（如空串、畸形地址），保留原值由 Turndown 自行处理
    return rawUrl;
  }
}

/**
 * 从 srcset 中挑选最高分辨率候选。srcset 以逗号分隔“候选URL 描述符”，
 * 描述符按 w 递增，故取最后一项即最高分辨率。
 */
function pickSrcsetCandidate(srcset: string | null): string | null {
  if (!srcset) {
    return null;
  }
  const entries = srcset
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const last = entries[entries.length - 1];
  if (!last) {
    return null;
  }
  return last.split(/\s+/)[0] || null;
}

/** 确定图片最终 src，按 懒加载属性 → src → srcset 的优先级取第一个可用的绝对地址 */
function resolveImageSrc(img: HTMLImageElement, baseUrl: string): string | null {
  const candidates: Array<string | null> = [
    ...LAZY_SRC_ATTRIBUTES.map((attr) => img.getAttribute(attr)),
    img.getAttribute('src'),
    pickSrcsetCandidate(img.getAttribute('srcset')),
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const resolved = toAbsoluteUrl(candidate, baseUrl);
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

/**
 * 遍历 root 下所有 <img>，修正 src 为绝对地址并补齐 alt，
 * 使得转换后的 Markdown 图片语法正确。
 */
export function normalizeImages(root: Element, baseUrl: string): void {
  const images = root.querySelectorAll('img');
  for (const image of images) {
    const resolved = resolveImageSrc(image as HTMLImageElement, baseUrl);
    if (resolved) {
      image.setAttribute('src', resolved);
    }
    if (!image.getAttribute('alt')) {
      image.setAttribute('alt', 'image');
    }
  }
}
