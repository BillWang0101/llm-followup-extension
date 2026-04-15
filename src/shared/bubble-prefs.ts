const KEY = 'bubbleSize';

export interface BubbleSize {
  w: number;
  h: number;
}

export async function loadBubbleSize(): Promise<BubbleSize | null> {
  try {
    const res = await chrome.storage.local.get(KEY);
    const v = res[KEY];
    if (v && typeof v.w === 'number' && typeof v.h === 'number') return v;
  } catch {}
  return null;
}

export async function saveBubbleSize(size: BubbleSize): Promise<void> {
  try {
    await chrome.storage.local.set({ [KEY]: size });
  } catch {}
}
