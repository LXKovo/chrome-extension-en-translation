/**
 * Popup 根组件：承载顶栏并在「主视图 / 设置视图」之间切换。
 * 布局依据 docs/layouts/示意图-主页面.md。
 */
import { useState } from 'react';
import AppHeader from './components/app-header';
import MainView from './components/main-view';
import SettingsView from './components/settings-view';

type ViewName = 'main' | 'settings';

export default function App() {
  const [view, setView] = useState<ViewName>('main');
  const isSettingsView = view === 'settings';

  return (
    <div className="app">
      <AppHeader
        isSettingsView={isSettingsView}
        onOpenSettings={() => setView('settings')}
        onBack={() => setView('main')}
      />
      {isSettingsView ? <SettingsView /> : <MainView />}
    </div>
  );
}
