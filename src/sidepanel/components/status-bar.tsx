/**
 * 状态区 StatusBar：单行状态提示。
 * 文案与状态映射依据 docs/layouts/示意图-主页面.md §2.3。
 * T2 仅呈现静态文案；完整状态流转与错误可读化由 T9 实现。
 */

/** 主流程状态（T9 将在此基础上完善流转） */
export type TranslationStatus = 'idle' | 'extracting' | 'translating' | 'done' | 'error';

const STATUS_TEXT: Record<TranslationStatus, string> = {
  idle: '点击上方按钮开始翻译',
  extracting: '正在提取文章内容…',
  translating: '正在翻译…',
  done: '✓ 翻译完成',
  error: '✗ 翻译失败',
};

interface StatusBarProps {
  status: TranslationStatus;
  /** 展示结果为恢复的上次结果时的时间戳（毫秒），状态区显示「上次翻译于 …」（T8） */
  restoredAt?: number | null;
}

/** 将时间戳格式化为「yyyy-mm-dd hh:mm」 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function StatusBar({ status, restoredAt = null }: StatusBarProps) {
  const text =
    restoredAt != null ? `上次翻译于 ${formatTimestamp(restoredAt)}` : STATUS_TEXT[status];

  return (
    <section className={`status-bar status-bar--${status}`} aria-live="polite">
      <span className="status-bar__dot" aria-hidden="true" />
      <span className="status-bar__text">{text}</span>
    </section>
  );
}
