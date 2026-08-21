/**
 * 顶栏 Header：主视图显示「标题 + 设置入口」，设置视图显示「返回 + 设置」。
 * 布局依据 docs/layouts/示意图-主页面.md §2.1 与 示意图-设置页面.md §2。
 */
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
        <button type="button" className="header-button" onClick={onBack}>
          ← 返回
        </button>
        <h1 className="app-header__title app-header__title--right">设置</h1>
      </header>
    );
  }

  return (
    <header className="app-header">
      <h1 className="app-header__title">文章翻译助手</h1>
      <button type="button" className="header-button" onClick={onOpenSettings}>
        ⚙️ 设置
      </button>
    </header>
  );
}
