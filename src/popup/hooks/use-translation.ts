/**
 * 一键翻译主流程 Hook（docs/design.md §6、§8）。
 * 职责：提取当前文章 → 交由 Background 流式翻译 → 逐字缓冲（打字机）→ 组装统一输出格式。
 * 展示与逻辑分离：本 Hook 只产出 Markdown 字符串与状态，渲染交给 md-wx（T6 结果区）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MESSAGE_EXTRACT_ARTICLE,
  MESSAGE_TRANSLATE_REQUEST,
  PORT_TRANSLATE_STREAM,
  STORAGE_KEY_LAST_RESULT,
  STREAM_EVENT_CHUNK,
  STREAM_EVENT_DONE,
  STREAM_EVENT_ERROR,
} from '../../shared/constants';
import type {
  ExtractArticleRequest,
  ExtractArticleResponse,
  TranslateRequest,
  StreamEvent,
} from '../../shared/message';
import type { LastResult } from '../../shared/types';
import type { TranslationStatus } from '../components/status-bar';

/** 打字机每个 tick 释放的字符数 */
const CHARS_PER_TICK = 3;

/** 打字机 tick 间隔（毫秒），约 60fps */
const TICK_INTERVAL_MS = 16;

/** 流翻译涉及的元数据（标题 / 作者 / 原文链接），标题亦用于下载文件名，均由插件后处理取得，不经模型 */
interface Metadata {
  title: string;
  author: string;
  url: string;
}

/** 文件名非法字符（Windows / macOS / 通用）；替换为下划线并限制长度 */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned.slice(0, 80);
}

/** 结果区待渲染的 Markdown 字符串 */
export interface UseTranslationReturn {
  status: TranslationStatus;
  markdown: string;
  errorMessage: string;
  isBusy: boolean;
  isTranslating: boolean;
  startTranslate: () => void;
  stopTranslate: () => void;
  downloadMarkdown: () => void;
  /**
   * 当前展示结果为「上次结果恢复」时的时间戳（毫秒），否则为 null。
   * 用于状态区显示「上次翻译于 …」（T8）。
   */
  restoredAt: number | null;
}

/**
 * 在翻译结果标题行后补全「作者 / 原文链接」两行（docs/design.md §5.3）。
 * 翻译输入不包含这两行，故无法在流式过程中精确插入到标题之后；
 * 这里假设模型保持 Markdown 结构，标题为含换行收尾的首行，动态在其后插入两行元数据。
 */
function insertHeaderLines(raw: string, author: string, url: string): string {
  if (!raw) {
    return '';
  }
  const newlineIndex = raw.indexOf('\n');
  const head = newlineIndex === -1 ? raw : raw.slice(0, newlineIndex);
  // 除去标题行后的冗余空行，保证「标题 → 作者/链接 → 正文」的固定分隔
  const body = newlineIndex === -1 ? '' : raw.slice(newlineIndex).replace(/^\s*\n+/, '');
  return `${head}\n\n> 作者：${author || '未知'}\n> 原文链接：${url}\n\n${body}`.trimEnd();
}

export function useTranslation(options: { model: string }): UseTranslationReturn {
  // 主页面选中的模型，随翻译请求传给后台，确保按用户当前选择翻译
  const { model } = options;

  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [meta, setMeta] = useState<Metadata>({ title: '', author: '', url: '' });
  // 打字机已释放的部分（驱动渲染），原始流数据保存在 ref，避免每字符重渲染
  const [unfoldedRaw, setUnfoldedRaw] = useState('');
  // 上次结果恢复的最终 Markdown；非空时优先展示（正文已含标题/作者/链接，无需再经 insertHeaderLines 补全）
  const [restoredMarkdown, setRestoredMarkdown] = useState('');
  // 恢复结果的完成时间戳，用于状态区「上次翻译于」提示
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  // 错误时回退展示的既有结果：翻译失败时不覆盖上次已有结果（T9）
  const [fallbackMarkdown, setFallbackMarkdown] = useState('');

  const portRef = useRef<chrome.runtime.Port | null>(null);
  const rawRef = useRef('');
  const cursorRef = useRef(0);
  // 当前实际展示的 Markdown（随渲染更新），供开始新翻译前快照；错误时用于回退保留上次结果
  const latestMarkdownRef = useRef('');
  // 开始新翻译前对上一步已有结果的快照
  const savedMarkdownRef = useRef('');
  const timerRef = useRef<number | undefined>(undefined);
  // 流已结束但仍需让打字机追平剩余内容，追平后再标记「完成」
  const completionPendingRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const closePort = useCallback(() => {
    if (portRef.current) {
      // 断开连接会触发后台 onDisconnect，从而中断底层流式请求
      portRef.current.disconnect();
      portRef.current = null;
    }
  }, []);

  /** 翻译失败时回退到本次翻译前已有的结果，避免覆盖上次结果（T9） */
  const restorePrevious = useCallback(() => {
    if (savedMarkdownRef.current) {
      setFallbackMarkdown(savedMarkdownRef.current);
    }
  }, []);

  /** 每个 tick 释放若干字符，推进“键入”进度 */
  const tick = useCallback(() => {
    const raw = rawRef.current;
    const next = Math.min(raw.length, cursorRef.current + CHARS_PER_TICK);
    cursorRef.current = next;
    setUnfoldedRaw(raw.slice(0, next));
    if (next >= raw.length) {
      stopTimer();
      // 流已完成且打字机已追平，此刻标记「完成」
      if (completionPendingRef.current) {
        completionPendingRef.current = false;
        setStatus('done');
      }
    }
  }, [stopTimer]);

  /** 确保打字机定时器在运行（有增量时启动，快进到追平后自动停止） */
  const ensureTimer = useCallback(() => {
    if (timerRef.current == null) {
      timerRef.current = window.setInterval(tick, TICK_INTERVAL_MS);
    }
  }, [tick]);

  /** 立即显示已生成的全部内容，并结束流（完成 / 停止共用） */
  const flushUnfolded = useCallback(() => {
    stopTimer();
    cursorRef.current = rawRef.current.length;
    setUnfoldedRaw(rawRef.current);
  }, [stopTimer]);

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case STREAM_EVENT_CHUNK:
          rawRef.current += event.delta;
          ensureTimer();
          break;
        case STREAM_EVENT_DONE:
          // 模型已完整输出，等待打字机追平后再由 tick 标记「完成」
          completionPendingRef.current = true;
          ensureTimer();
          break;
        case STREAM_EVENT_ERROR:
          setErrorMessage(event.error);
          restorePrevious();
          setStatus('error');
          closePort();
          break;
      }
    },
    [ensureTimer, restorePrevious, closePort],
  );

  /** 启动流式翻译：重置缓冲区、建立 Port、推送翻译请求 */
  const beginStream = useCallback(
    (source: string, nextMeta: Metadata) => {
      closePort();
      rawRef.current = '';
      cursorRef.current = 0;
      completionPendingRef.current = false;
      setUnfoldedRaw('');
      setRestoredMarkdown('');
      setFallbackMarkdown('');
      setRestoredAt(null);
      setMeta(nextMeta);
      setErrorMessage('');
      setStatus('translating');

      let port: chrome.runtime.Port;
      try {
        port = chrome.runtime.connect({ name: PORT_TRANSLATE_STREAM });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '无法建立翻译连接');
        setStatus('error');
        return;
      }
      portRef.current = port;

      const onMessage = (event: StreamEvent) => handleStreamEvent(event);
      port.onMessage.addListener(onMessage);
      port.onDisconnect.addListener(() => {
        // 连接断开（后台回收 / 主动停止），清理引用即可
        if (portRef.current === port) {
          portRef.current = null;
        }
      });

      const request: TranslateRequest = {
        type: MESSAGE_TRANSLATE_REQUEST,
        markdown: source,
        model,
      };
      port.postMessage(request);
    },
    [closePort, handleStreamEvent, model],
  );

  /** 一键翻译：提取当前文章 → 拼接标题/正文 → 交由后台流式翻译 */
  const startTranslate = useCallback(async () => {
    if (status === 'extracting' || status === 'translating') {
      return;
    }
    // 快照本次翻译前的已有结果，翻译失败时回退展示，不覆盖上次结果（T9）
    savedMarkdownRef.current = latestMarkdownRef.current;
    setStatus('extracting');
    setErrorMessage('');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[popup] 查询到活动标签页', tab?.id, location.href);
      if (!tab?.id) {
        throw new Error('未找到当前活动标签页');
      }
      const request: ExtractArticleRequest = { type: MESSAGE_EXTRACT_ARTICLE };
      console.log('[popup] 向内容脚本发送提取请求 tabId=', tab.id);
      const response = await chrome.tabs.sendMessage<ExtractArticleRequest, ExtractArticleResponse>(
        tab.id,
        request,
      );
      console.log(
        '[popup] 收到提取响应 ok=',
        response.ok,
        response.ok ? undefined : response.error,
      );
      if (!response.ok) {
        throw new Error(response.error);
      }
      const { title, author, url, markdown: body } = response.data;
      // 翻译输入为「标题 + 正文」Markdown，标题一并译为中文；作者/原文链接由插件后处理补全
      const source = `${title ? `# ${title}` : ''}\n\n${body}`.trim();
      beginStream(source, { title, author, url });
    } catch (error) {
      // 注意：sendMessage 在页面未注入内容脚本时也会 reject（报 “Receiving end does not exist” 等），
      // 此处一并记录原始错误供排查，避免仅显示灰化后的可读文案
      console.warn('[popup] 提取失败', error);
      setErrorMessage(error instanceof Error ? error.message : '提取失败');
      restorePrevious();
      setStatus('error');
    }
  }, [status, beginStream, restorePrevious]);

  /** 停止：中断流式请求并立即显示已生成内容 */
  const stopTranslate = useCallback(() => {
    completionPendingRef.current = false;
    closePort();
    flushUnfolded();
    setStatus('done');
  }, [closePort, flushUnfolded]);

  // 组件卸载时清理定时器与 Port 连接
  useEffect(
    () => () => {
      stopTimer();
      closePort();
    },
    [stopTimer, closePort],
  );

  // 打开 Popup 时恢复上次结果（T8）：加载 lastResult 并默认展示，可直接查看或下载
  useEffect(() => {
    let cancelled = false;
    const loadLastResult = async () => {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY_LAST_RESULT);
        if (cancelled) {
          return;
        }
        const stored = result[STORAGE_KEY_LAST_RESULT] as LastResult | undefined;
        if (stored) {
          setMeta({ title: stored.title, author: stored.author, url: stored.url });
          setRestoredMarkdown(stored.markdown);
          setRestoredAt(stored.timestamp);
          setStatus('done');
        }
      } catch (error) {
        // 读取失败仅记录，不影响后续直接翻译
        console.warn('读取上次结果失败', error);
      }
    };
    loadLastResult();
    return () => {
      cancelled = true;
    };
  }, []);

  // 结果区 Markdown：随打字机进度增长，并为「标题 → 作者/链接 → 正文」补全元数据行；
  // 优先顺序：错误回退结果 > 恢复的上次结果 > 打字机实况（恢复结果已含完整头部，避免重复插入元数据行）
  const markdown =
    fallbackMarkdown || restoredMarkdown || insertHeaderLines(unfoldedRaw, meta.author, meta.url);
  // 记录当前实际展示的内容，供「开始新翻译 → 失败回退」快照使用
  latestMarkdownRef.current = markdown;
  const isBusy = status === 'extracting' || status === 'translating';
  const isTranslating = status === 'translating';

  // 翻译完成（含手动停止）后将最终结果连同元数据持久化到 lastResult（T8）
  useEffect(() => {
    if (status !== 'done' || restoredMarkdown || !markdown) {
      return;
    }
    const lastResult: LastResult = {
      title: meta.title,
      author: meta.author,
      url: meta.url,
      markdown,
      timestamp: Date.now(),
    };
    chrome.storage.local.set({ [STORAGE_KEY_LAST_RESULT]: lastResult }).catch((error) => {
      console.warn('保存上次结果失败', error);
    });
  }, [status, markdown, restoredMarkdown, meta]);

  /**
   * 下载当前 Markdown 为 `.md` 文件（T7）。
   * 文件名使用文章标题（净化非法字符），标题缺失时以时间戳兜底；无结果时不产生下载。
   */
  const downloadMarkdown = useCallback(() => {
    if (!markdown) {
      return;
    }
    const safeTitle = sanitizeFilename(meta.title);
    const filename = safeTitle ? `${safeTitle}.md` : `translation-${Date.now()}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [markdown, meta.title]);

  return {
    status,
    markdown,
    errorMessage,
    isBusy,
    isTranslating,
    startTranslate,
    stopTranslate,
    downloadMarkdown,
    restoredAt,
  };
}
