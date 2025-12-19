import localizationData from '../../configs/json/LocalizationConfig.json';

export type SupportedLanguage = 'zh-CN' | 'en-US';

type LocalizationEntry = Record<SupportedLanguage, string>;
type LocalizationData = Record<string, LocalizationEntry>;

const data = localizationData as LocalizationData;

let currentLanguage: SupportedLanguage = 'zh-CN';

/**
 * 设置当前语言
 */
export function setLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang;
}

/**
 * 获取当前语言
 */
export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * 根据 Key 获取当前语言的文本
 * 如果 Key 不存在，返回 Key 本身作为 fallback
 */
export function getText(key: string): string {
  const entry = data[key];
  if (!entry) return key;
  return entry[currentLanguage] ?? entry['zh-CN'] ?? key;
}

/**
 * 根据 Key 获取指定语言的文本
 */
export function getTextByLang(key: string, lang: SupportedLanguage): string {
  const entry = data[key];
  if (!entry) return key;
  return entry[lang] ?? key;
}

/**
 * 检查 Key 是否存在
 */
export function hasKey(key: string): boolean {
  return key in data;
}
