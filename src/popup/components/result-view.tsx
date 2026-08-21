/**
 * 结果区 ResultView：用 md-wx 的 MarkdownRenderer 渲染 Markdown，无内容时显示空态。
 * 布局依据 docs/layouts/示意图-主页面.md §2.4、§3.1。
 * 弹窗宽度仅 380px，故关闭 md-wx 自带的设置面板 / 主题切换 / 视图切换等工具栏。
 */
import { MarkdownRenderer } from 'md-wx';

interface ResultViewProps {
  /** 待渲染的 Markdown；为空时展示空态提示 */
  markdown: string;
}

export default function ResultView({ markdown }: ResultViewProps) {
  if (!markdown) {
    return (
      <section className="result-view result-view--empty">
        <p className="result-view__empty-text">将当前英文文章一键翻译为中文 Markdown</p>
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
