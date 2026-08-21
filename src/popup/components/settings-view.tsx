/**
 * 设置视图（T4）：API 地址 / API Key / 默认模型 的表单与保存校验。
 * 布局依据 docs/layouts/示意图-设置页面.md。
 * 配置写入 chrome.storage.local 的 settings 键（由 App 统一执行），保存成功返回主页面。
 */
import { useEffect, useState } from 'react';
import { MODEL_OPTIONS } from '../../shared/constants';
import type { Settings } from '../../shared/types';

interface SettingsViewProps {
  /** 当前选中的模型（作为「默认模型」初值，与主页面下拉联动） */
  model: string;
  /** 已保存的配置：用于回填表单并判断是否有未保存改动 */
  savedSettings: Settings;
  /** 保存配置（写入存储并返回主页面） */
  onSave: (settings: Settings) => Promise<void>;
  /** 上报是否存在未保存改动（供 App 在返回主页面时确认） */
  onDirtyChange: (dirty: boolean) => void;
}

/** 校验 API 地址：必须是 http(s) 绝对地址 */
function isBaseURLValid(baseURL: string): boolean {
  try {
    const url = new URL(baseURL);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function SettingsView({
  model,
  savedSettings,
  onSave,
  onDirtyChange,
}: SettingsViewProps) {
  // 表单草稿：进入设置页时以「已保存配置 + 当前选中模型」初始化，仅在本视图内维护
  const [draft, setDraft] = useState<Settings>({ ...savedSettings, model });
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const trimmedBaseURL = draft.baseURL.trim();
  const trimmedApiKey = draft.apiKey.trim();

  const isBaseURLMissing = trimmedBaseURL === '';
  const isApiKeyMissing = trimmedApiKey === '';
  const isBaseURLInvalid = !isBaseURLMissing && !isBaseURLValid(trimmedBaseURL);
  // 必填项为空、地址格式非法或保存中时禁止保存
  const isSaveDisabled = isBaseURLMissing || isApiKeyMissing || isBaseURLInvalid || isSaving;

  // 与已保存配置比较，判断是否存在未保存改动
  const hasUnsavedChanges =
    trimmedBaseURL !== savedSettings.baseURL.trim() ||
    trimmedApiKey !== savedSettings.apiKey.trim() ||
    draft.model !== savedSettings.model;

  useEffect(() => {
    onDirtyChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const updateDraft = (patch: Partial<Settings>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaveError('');
  };

  const handleSave = async () => {
    if (isSaveDisabled) {
      return;
    }
    setIsSaving(true);
    setSaveError('');
    try {
      await onSave({
        baseURL: trimmedBaseURL,
        apiKey: trimmedApiKey,
        model: draft.model,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试');
      setIsSaving(false);
    }
  };

  return (
    <section className="settings-view">
      <div className="settings-form">
        <div className="settings-form__group">
          <label className="settings-form__label" htmlFor="settings-base-url">
            API 地址
          </label>
          <input
            id="settings-base-url"
            className={`settings-form__input${isBaseURLInvalid ? ' settings-form__input--error' : ''}`}
            type="url"
            placeholder="https://api.deepseek.com"
            value={draft.baseURL}
            onChange={(event) => updateDraft({ baseURL: event.target.value })}
          />
          {isBaseURLMissing ? (
            <p className="settings-form__hint settings-form__hint--error">必填</p>
          ) : isBaseURLInvalid ? (
            <p className="settings-form__hint settings-form__hint--error">
              请输入有效的 http(s) 地址
            </p>
          ) : null}
        </div>

        <div className="settings-form__group">
          <label className="settings-form__label" htmlFor="settings-api-key">
            API Key
          </label>
          <div className="settings-form__key-row">
            <input
              id="settings-api-key"
              className={`settings-form__input${isApiKeyMissing ? ' settings-form__input--error' : ''}`}
              type={isKeyVisible ? 'text' : 'password'}
              placeholder="sk-…"
              value={draft.apiKey}
              onChange={(event) => updateDraft({ apiKey: event.target.value })}
            />
            <button
              type="button"
              className="settings-form__key-toggle"
              onClick={() => setIsKeyVisible((prev) => !prev)}
            >
              {isKeyVisible ? '隐藏' : '👁 显示'}
            </button>
          </div>
          {isApiKeyMissing ? (
            <p className="settings-form__hint settings-form__hint--error">必填</p>
          ) : null}
        </div>

        <div className="settings-form__group">
          <label className="settings-form__label" htmlFor="settings-model">
            默认模型
          </label>
          <select
            id="settings-model"
            className="settings-form__select"
            value={draft.model}
            onChange={(event) => updateDraft({ model: event.target.value })}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {saveError ? <p className="settings-form__error">{saveError}</p> : null}

        <button
          type="button"
          className="button button--primary settings-form__save"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          {isSaving ? '保存中…' : '保存设置'}
        </button>

        <p className="settings-form__privacy">
          ⓘ API Key 仅保存在本地浏览器，仅随翻译请求发送至对应服务。
        </p>
      </div>
    </section>
  );
}
