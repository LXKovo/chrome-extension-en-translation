/**
 * 主视图：组合「操作区 / 状态区 / 结果区」三块。
 * 一键翻译主流程收敛在 useTranslation Hook（提取 → 后台流式翻译 → 打字机 → 统一格式）。
 * 模型选择由 App 统一管理（T4），随翻译请求下发给后台，确保按用户当前选择翻译。
 */
import { useTranslation } from '../hooks/use-translation';
import ActionBar from './action-bar';
import ResultView from './result-view';
import StatusBar from './status-bar';

interface MainViewProps {
  /** 当前选中的模型（来自 App，与设置页「默认模型」联动） */
  model: string;
  /** 切换模型 */
  onModelChange: (model: string) => void;
  /** 是否已配置 API Key；未配置时空态引导进入设置页（T9） */
  hasApiKey: boolean;
  /** 点击空态「去设置」按钮，跳转设置视图 */
  onOpenSettings: () => void;
}

export default function MainView({
  model,
  onModelChange,
  hasApiKey,
  onOpenSettings,
}: MainViewProps) {
  const {
    status,
    markdown,
    errorMessage,
    isBusy,
    isTranslating,
    startTranslate,
    stopTranslate,
    downloadMarkdown,
    restoredAt,
  } = useTranslation({ model });

  return (
    <>
      <ActionBar
        model={model}
        onModelChange={onModelChange}
        isDownloadDisabled={!markdown}
        isBusy={isBusy}
        isTranslating={isTranslating}
        onTranslate={startTranslate}
        onStop={stopTranslate}
        onDownload={downloadMarkdown}
      />
      <StatusBar status={status} restoredAt={restoredAt} />
      {errorMessage ? (
        <div className="status-bar status-bar--error status-bar--detail">{errorMessage}</div>
      ) : null}
      <ResultView markdown={markdown} hasApiKey={hasApiKey} onOpenSettings={onOpenSettings} />
    </>
  );
}
