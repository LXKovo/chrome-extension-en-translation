/**
 * 结果区 ResultView：用 md-wx 的 MarkdownRenderer 渲染 Markdown，无内容时显示空态。
 * 布局依据 docs/layouts/示意图-主页面.md §2.4、§3.1。
 * 弹窗宽度仅 380px，故关闭 md-wx 自带的设置面板 / 主题切换 / 视图切换等工具栏。
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

export default function ResultView({ markdown, hasApiKey, onOpenSettings }: ResultViewProps) {
  if (!markdown) {
    return (
      <section className="result-view result-view--empty">
        {hasApiKey ? (
          <p className="result-view__empty-text">将当前英文文章一键翻译为中文 Markdown</p>
        ) : (
          <div className="result-view__empty">
            <p className="result-view__empty-text">尚未配置 API Key，配置后即可一键翻译</p>
            <button
              type="button"
              className="button button--secondary result-view__empty-action"
              onClick={onOpenSettings}
            >
              去设置
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="result-view">
      <MarkdownRenderer
        markdown={markdown}
        theme="minimal"
        showSettings={false}
        enableCopy={false}
        enableThemeSwitch={false}
        enableViewModeToggle={false}
      />
    </section>
  );
}
