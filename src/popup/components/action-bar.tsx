/**
 * 操作区 ActionBar：模型下拉 + 「一键翻译本文」主操作 + 「下载 Markdown」次操作。
 * 布局依据 docs/layouts/示意图-主页面.md §2.2。
 * T2 仅搭建静态结构，交互逻辑分别由 T4（模型联动）/ T6（翻译）/ T7（下载）实现。
 */
import { MODEL_OPTIONS } from '../../shared/constants';

interface ActionBarProps {
  /** 当前选中的模型 */
  model: string;
  /** 切换模型 */
  onModelChange: (model: string) => void;
  /** 「下载 Markdown」是否禁用（无结果时置灰） */
  isDownloadDisabled: boolean;
  /** 点击「一键翻译本文」（T3 临时对接内容脚本提取，T6 改为完整翻译流程） */
  onExtract: () => void;
  /** 提取进行中，禁用触发按钮 */
  isExtracting: boolean;
}

export default function ActionBar({
  model,
  onModelChange,
  isDownloadDisabled,
  onExtract,
  isExtracting,
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
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="button button--primary"
        onClick={onExtract}
        disabled={isExtracting}
      >
        🔄 一键翻译本文
      </button>

      <button type="button" className="button button--secondary" disabled={isDownloadDisabled}>
        ⬇️ 下载 Markdown
      </button>
    </section>
  );
}
