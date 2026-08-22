/**
 * 顶栏 Header：主视图显示「品牌印章 + 标题 + 设置入口」，设置视图显示「返回 + 设置」。
 * 布局依据 docs/layouts/示意图-主页面.md §2.1 与 示意图-设置页面.md §2。
 */
import { ArrowLeftIcon, GearIcon } from './icons';

interface AppHeaderProps {
  /** 当前是否处于设置视图 */
  isSettingsView: boolean;
  /** 点击「⚙️ 设置」 */
  onOpenSettings: () => void;
  /** 点击「← 返回」 */
  onBack: () => void;
}

export default function AppHeader({ isSettingsView, onOpenSettings, onBack }: AppHeaderProps) {
  if (isSettingsView) {
    return (
      <header className="app-header">
        <button type="button" className="icon-button" onClick={onBack} aria-label="返回主页面">
          <ArrowLeftIcon size={18} />
        </button>
        <h1 className="app-header__title app-header__title--right">设置</h1>
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__seal" aria-hidden="true">
          译
        </span>
        <h1 className="app-header__title">文章翻译助手</h1>
      </div>
      <button
        type="button"
        className="icon-button icon-button--right"
        onClick={onOpenSettings}
        aria-label="打开设置"
      >
        <GearIcon size={18} />
      </button>
    </header>
  );
}
