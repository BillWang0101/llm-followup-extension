import { PROVIDERS } from './types';
import type { HistoryEntry } from './history';

function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtFilenameStamp(ts = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** 单条 → markdown 片段（不含文件头） */
export function formatEntryAsMarkdown(entry: HistoryEntry): string {
  const providerLabel = PROVIDERS[entry.provider]?.label ?? entry.provider;
  const lines: string[] = [];
  lines.push(`## ${fmtDateTime(entry.updatedAt)} · ${entry.hostname}`);
  lines.push(`- Provider：${providerLabel} / ${entry.model}`);
  lines.push(`- 选中文字：「${entry.selection}」`);
  lines.push('');
  for (const t of entry.turns) {
    if (t.role === 'user') {
      lines.push('**你问：**');
      lines.push('');
      lines.push(t.content.trim());
    } else {
      lines.push('**模型：**');
      lines.push('');
      lines.push(t.content.trim());
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** 多条 → 完整 markdown 文档（含文件头） */
export function formatEntriesAsMarkdown(entries: HistoryEntry[]): string {
  const header = [
    '# LLM 旁注追问 · 历史导出',
    `导出时间：${fmtDateTime(Date.now())}（共 ${entries.length} 条）`,
    '',
    '---',
    '',
  ].join('\n');
  return header + entries.map(formatEntryAsMarkdown).join('\n---\n\n');
}

/** 多条 → JSON（结构化存档） */
export function formatEntriesAsJson(entries: HistoryEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/** 触发浏览器下载。用 Blob + <a download>，无需权限。 */
export function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportMarkdownFile(entries: HistoryEntry[]): void {
  triggerDownload(
    `llm-followup-history-${fmtFilenameStamp()}.md`,
    formatEntriesAsMarkdown(entries),
    'text/markdown;charset=utf-8'
  );
}

export function exportJsonFile(entries: HistoryEntry[]): void {
  triggerDownload(
    `llm-followup-history-${fmtFilenameStamp()}.json`,
    formatEntriesAsJson(entries),
    'application/json;charset=utf-8'
  );
}
