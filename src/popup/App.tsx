/**
 * Popup 根组件：承载顶栏，在「主视图 / 设置视图」之间切换。
 * 在此统一管理已保存配置（settings 键）与当前选中模型（主页面下拉与设置页「默认模型」联动）。
 * 布局依据 docs/layouts/示意图-主页面.md 与 示意图-设置页面.md。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, STORAGE_KEY_SETTINGS } from '../shared/constants';
import type { Settings } from '../shared/types';
import AppHeader from './components/app-header';
import MainView from './components/main-view';
import SettingsView from './components/settings-view';

type ViewName = 'main' | 'settings';

/** 保存成功提示的展示时长（毫秒） */
const TOAST_DURATION_MS = 2000;

export default function App() {
  const [view, setView] = useState<ViewName>('main');
  const isSettingsView = view === 'settings';

  // 已保存的配置（settings 键），打开 Popup 时从 chrome.storage.local 恢复
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // 当前选中的模型：主页面下拉与设置页「默认模型」共用同一状态，保持联动
  const [model, setModel] = useState(DEFAULT_SETTINGS.model);
  // 设置页是否存在未保存改动（返回主页面时需确认）
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  // 保存成功提示
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  // 打开 Popup 时恢复已保存配置，并同步模型选择
  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
        if (cancelled) {
          return;
        }
        const stored = result[STORAGE_KEY_SETTINGS] as Settings | undefined;
        if (stored) {
          setSettings(stored);
          setModel(stored.model);
        }
      } catch (error) {
        // 读取失败时沿用默认配置，仅记录不影响使用
        console.warn('读取配置失败，使用默认配置', error);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // 组件卸载时清理 toast 计时器
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(''), TOAST_DURATION_MS);
  }, []);

  // 保存设置：写入存储、同步模型选择，并返回主页面提示已保存
  const handleSaveSettings = useCallback(
    async (next: Settings) => {
      await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: next });
      setSettings(next);
      setModel(next.model);
      setIsSettingsDirty(false);
      setView('main');
      showToast('已保存');
    },
    [showToast],
  );

  const handleSettingsDirtyChange = useCallback((dirty: boolean) => {
    setIsSettingsDirty(dirty);
  }, []);

  // 返回主页面：设置页存在未保存改动时先确认
  const handleBack = useCallback(() => {
    if (
      isSettingsView &&
      isSettingsDirty &&
      !window.confirm('有未保存的更改，确定返回主页面吗？')
    ) {
      return;
    }
    setView('main');
  }, [isSettingsView, isSettingsDirty]);

  return (
    <div className="app">
      <AppHeader
        isSettingsView={isSettingsView}
        onOpenSettings={() => setView('settings')}
        onBack={handleBack}
      />
      {isSettingsView ? (
        <SettingsView
          model={model}
          savedSettings={settings}
          onSave={handleSaveSettings}
          onDirtyChange={handleSettingsDirtyChange}
        />
      ) : (
        <MainView model={model} onModelChange={setModel} />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
