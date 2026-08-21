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
}

export default function StatusBar({ status }: StatusBarProps) {
  return (
    <section className={`status-bar status-bar--${status}`}>
      <span className="status-bar__dot">●</span>
      <span className="status-bar__text">{STATUS_TEXT[status]}</span>
    </section>
  );
}
