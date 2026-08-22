/**
 * 操作区 ActionBar：模型下拉 + 「一键翻译 / 停止」主操作 + 「下载 Markdown」次操作。
 * 布局依据 docs/layouts/示意图-主页面.md §2.2。
 * T2 仅提供静态结构；交互逻辑：T4（模型联动）/ T6（翻译与停止）/ T7（下载）。
 */
import { MODEL_OPTIONS } from '../../shared/constants';
import { DownloadIcon, StopIcon, TranslateIcon } from './icons';

interface ActionBarProps {
  /** 当前选中的模型 */
  model: string;
  /** 切换模型 */
  onModelChange: (model: string) => void;
  /** 「下载 Markdown」是否禁用（无结果时置灰） */
  isDownloadDisabled: boolean;
  /** 提取中 / 翻译中：翻译按钮不可重复触发，模型下拉锁定 */
  isBusy: boolean;
  /** 翻译中：主按钮切换为「停止」 */
  isTranslating: boolean;
  /** 点击「一键翻译」 */
  onTranslate: () => void;
  /** 点击「停止」 */
  onStop: () => void;
  /** 点击「下载 Markdown」（无结果时按钮禁用，不触发） */
  onDownload: () => void;
}

export default function ActionBar({
  model,
  onModelChange,
  isDownloadDisabled,
  isBusy,
  isTranslating,
  onTranslate,
  onStop,
  onDownload,
}: ActionBarProps) {
  return (
    <section className="action-bar">
      <div className="action-bar__model">
        <label className="action-bar__label" htmlFor="model-select">
          模型
        </label>
        <select
          id="model-select"
          className="action-bar__select"
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={isBusy}
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isTranslating ? (
        <button type="button" className="button button--danger" onClick={onStop}>
          <StopIcon size={16} />
          <span>停止</span>
        </button>
      ) : (
        <button
          type="button"
          className="button button--primary"
          onClick={onTranslate}
          disabled={isBusy}
          aria-busy={isBusy}
        >
          {isBusy ? <span className="spinner" /> : <TranslateIcon size={17} />}
          <span>{isBusy ? '正在提取文章…' : '一键翻译本文'}</span>
        </button>
      )}

      <button
        type="button"
        className="button button--secondary"
        disabled={isDownloadDisabled}
        onClick={onDownload}
      >
        <DownloadIcon size={16} />
        <span>下载 Markdown</span>
      </button>
    </section>
  );
}
