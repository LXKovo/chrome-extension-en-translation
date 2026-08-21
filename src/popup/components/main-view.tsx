/**
 * 主视图：组合「操作区 / 状态区 / 结果区」三块。
 * T3 阶段把「一键翻译本文」临时对接内容脚本提取，用于验证提取链路结果
 * （标题 / 作者 / URL / 正文 / 图片语法），T6 将替换为完整翻译流程。
 * 模型选择由 App 统一管理（T4），与设置页「默认模型」联动。
 */
import { useState } from 'react';
import { MESSAGE_EXTRACT_ARTICLE } from '../../shared/constants';
import type { ExtractArticleRequest, ExtractArticleResponse } from '../../shared/message';
import ActionBar from './action-bar';
import ResultView from './result-view';
import StatusBar, { type TranslationStatus } from './status-bar';

/** 将提取结果拼成需求文档统一格式的开头（标题 / 作者 / 原文链接） */
function buildMarkdown(title: string, author: string, url: string, body: string): string {
  return `# ${title || '无标题'}\n\n> 作者：${author || '未知'}\n> 原文链接：${url}\n\n${body}`;
}

interface MainViewProps {
  /** 当前选中的模型（来自 App，与设置页「默认模型」联动） */
  model: string;
  /** 切换模型 */
  onModelChange: (model: string) => void;
}

export default function MainView({ model, onModelChange }: MainViewProps) {
  // T3 临时演示：保存提取到的 Markdown，脱离静态示例
  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExtract = async () => {
    if (status === 'extracting') {
      return;
    }
    setStatus('extracting');
    setErrorMessage('');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('未找到当前活动标签页');
      }
      const request: ExtractArticleRequest = { type: MESSAGE_EXTRACT_ARTICLE };
      const response = await chrome.tabs.sendMessage<ExtractArticleRequest, ExtractArticleResponse>(
        tab.id,
        request,
      );
      if (!response.ok) {
        throw new Error(response.error);
      }
      const { title, author, url, markdown: body } = response.data;
      setMarkdown(buildMarkdown(title, author, url, body));
      setStatus('done');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '提取失败');
      setStatus('error');
    }
  };

  return (
    <>
      <ActionBar
        model={model}
        onModelChange={onModelChange}
        isDownloadDisabled={!markdown}
        onExtract={handleExtract}
        isExtracting={status === 'extracting'}
      />
      <StatusBar status={status} />
      {errorMessage ? (
        <div className="status-bar status-bar--error status-bar--detail">{errorMessage}</div>
      ) : null}
      <ResultView markdown={markdown} />
    </>
  );
}
