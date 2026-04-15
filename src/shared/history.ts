import type { ChatMessage, Provider } from './types';

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  hostname: string;
  selection: string;
  turns: ChatMessage[];
  provider: Provider;
  model: string;
}

const KEY = 'history';
const MAX_ENTRIES = 200;

export function newEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const res = await chrome.storage.local.get(KEY);
  const arr = (res[KEY] ?? []) as HistoryEntry[];
  return arr.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Upsert by id. Only persist entries that have at least one assistant turn. */
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  if (!entry.turns.some((t) => t.role === 'assistant' && t.content.trim())) return;
  const res = await chrome.storage.local.get(KEY);
  const arr = (res[KEY] ?? []) as HistoryEntry[];
  const idx = arr.findIndex((e) => e.id === entry.id);
  if (idx >= 0) arr[idx] = entry;
  else arr.unshift(entry);
  arr.sort((a, b) => b.updatedAt - a.updatedAt);
  await chrome.storage.local.set({ [KEY]: arr.slice(0, MAX_ENTRIES) });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const res = await chrome.storage.local.get(KEY);
  const arr = ((res[KEY] ?? []) as HistoryEntry[]).filter((e) => e.id !== id);
  await chrome.storage.local.set({ [KEY]: arr });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [KEY]: [] });
}
