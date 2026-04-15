import { DEFAULT_SETTINGS, Settings } from './types';

const KEY = 'settings';

/** 历史上默认过的 prompt 模板（命中则自动迁移到最新默认，避免旧模板遗留） */
const LEGACY_DEFAULT_TEMPLATES: string[] = [
  '在以下这段回答中：\n```\n{context}\n```\n请解释其中的「{selection}」。{question}',
];

export async function loadSettings(): Promise<Settings> {
  const res = await chrome.storage.sync.get(KEY);
  const stored = (res[KEY] ?? {}) as Partial<Settings>;
  if (stored.promptTemplate && LEGACY_DEFAULT_TEMPLATES.includes(stored.promptTemplate)) {
    stored.promptTemplate = DEFAULT_SETTINGS.promptTemplate;
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const curr = await loadSettings();
  const next = { ...curr, ...patch };
  await chrome.storage.sync.set({ [KEY]: next });
  return next;
}

export function onSettingsChange(cb: (s: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'sync' && changes[KEY]) {
      cb({ ...DEFAULT_SETTINGS, ...(changes[KEY].newValue ?? {}) });
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
