/**
 * 主视图：组合「操作区 / 状态区 / 结果区」三块。
 * T2 阶段结果区渲染静态示例 Markdown，用于验证 md-wx 接入。
 */
import { useState } from 'react';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { SAMPLE_MARKDOWN } from '../sample-markdown';
import ActionBar from './action-bar';
import ResultView from './result-view';
import StatusBar from './status-bar';

export default function MainView() {
  // T4 会把模型选择改为与 settings 联动，这里先用默认值维持交互可用
  const [model, setModel] = useState(DEFAULT_SETTINGS.model);
  const markdown = SAMPLE_MARKDOWN;

  return (
    <>
      <ActionBar model={model} onModelChange={setModel} isDownloadDisabled={!markdown} />
      <StatusBar status="idle" />
      <ResultView markdown={markdown} />
    </>
  );
}
