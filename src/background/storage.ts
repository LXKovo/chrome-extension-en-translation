/**
 * 后台存储读写封装（docs/design.md §5.4 / §7）。
 * T5 仅需读取用户配置 settings；lastResult 的写入与恢复由 T8 处理。
 */
import { DEFAULT_SETTINGS, STORAGE_KEY_SETTINGS } from '../shared/constants';
import type { Settings } from '../shared/types';

/**
 * 读取翻译配置，缺省或缺失键时回退到默认配置。
 * 保证 Background 始终拿到完整 settings（含 baseURL / apiKey / model）再发起翻译。
 */
export async function readSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  const stored = result[STORAGE_KEY_SETTINGS] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
