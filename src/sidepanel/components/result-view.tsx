/**
 * 结果区 ResultView：用 md-wx 的 MarkdownRenderer 渲染 Markdown，无内容时显示空态。
 * 布局依据 docs/layouts/示意图-主页面.md §2.4、§3.1。
 * 结果区宽度随右侧侧边栏自适应，为保持结果聚焦与极简，关闭 md-wx 自带的设置面板 / 主题切换 / 视图切换等工具栏。
 * 有内容时将渲染结果包裹在「阅读卡片」中，便于排版与滚动。
 */
import { MarkdownRenderer } from 'md-wx';

interface ResultViewProps {
  /** 待渲染的 Markdown；为空时展示空态提示 */
  markdown: string;
  /** 是否已配置 API Key；未配置时空态引导进入设置页（T9） */
  hasApiKey: boolean;
  /** 点击空态「去设置」按钮，跳转设置视图 */
  onOpenSettings: () => void;
}

/** 空态插画：朱砂圆底 + 翻译（语言）符号，纯内联 SVG，无外部图片依赖 */
function EmptyIllustration() {
  return (
    <svg
      className="result-view__empty-illustration"
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="36" fill="var(--accent-soft)" />
      <g stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 42 50 54" />
        <path d="m36 54 12-12 4-6" />
        <path d="M32 40h16" />
        <path d="M40 36h2" />
        <path d="m64 64-8-16-8 16" />
        <path d="M50 60h12" />
      </g>
      <path
        d="M72 18l1.3 3.5 3.5 1.3-3.5 1.3-1.3 3.5-1.3-3.5-3.5-1.3 3.5-1.3z"
        fill="var(--accent)"
        opacity="0.7"
      />
    </svg>
  );
}

export default function ResultView({ markdown, hasApiKey, onOpenSettings }: ResultViewProps) {
  if (!markdown) {
    return (
      <section className="result-view result-view--empty">
        <div className="result-view__empty">
          <EmptyIllustration />
          {hasApiKey ? (
            <>
              <p className="result-view__empty-title">将英文文章一键翻译为中文</p>
              <p className="result-view__empty-text">提取正文 → 翻译 → 以 Markdown 阅读</p>
            </>
          ) : (
            <>
              <p className="result-view__empty-title">尚未配置 API Key</p>
              <p className="result-view__empty-text">配置后即可一键翻译当前文章</p>
              <button
                type="button"
                className="button button--secondary result-view__empty-action"
                onClick={onOpenSettings}
              >
                去设置
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="result-view result-view--article">
      <div className="article-card">
        <MarkdownRenderer
          markdown={markdown}
          theme="minimal"
          showSettings={false}
          enableCopy={false}
          enableThemeSwitch={false}
          enableViewModeToggle={false}
        />
      </div>
    </section>
  );
}
