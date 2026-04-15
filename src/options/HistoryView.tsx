import { useEffect, useMemo, useState } from 'react';
import {
  clearHistory,
  deleteHistoryEntry,
  loadHistory,
  type HistoryEntry,
} from '../shared/history';
import {
  exportJsonFile,
  exportMarkdownFile,
  formatEntryAsMarkdown,
} from '../shared/history-export';
import { renderMarkdown } from '../shared/markdown';
import { PROVIDERS } from '../shared/types';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `昨天 ${hh}:${mm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

interface EntryCardProps {
  entry: HistoryEntry;
  selected: boolean;
  justCopied: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function EntryCard({ entry, selected, justCopied, onToggleSelect, onDelete, onCopy }: EntryCardProps) {
  const [open, setOpen] = useState(false);
  const firstUser = entry.turns.find((t) => t.role === 'user');
  const firstAssistant = entry.turns.find((t) => t.role === 'assistant');
  const provider = PROVIDERS[entry.provider];

  return (
    <div className={`hist-card ${open ? 'open' : ''} ${selected ? 'selected' : ''}`}>
      <div className="hist-card-body">
        <input
          type="checkbox"
          className="hist-checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label="选中此记录"
        />
        <div className="hist-card-main">
          <div className="hist-head" onClick={() => setOpen((o) => !o)}>
            <div className="hist-meta">
              <span className="hist-time">{formatTime(entry.updatedAt)}</span>
              <span className="hist-sep">·</span>
              <span className="hist-host">{entry.hostname}</span>
              <span className="hist-sep">·</span>
              <span className="hist-provider">
                {provider?.label ?? entry.provider} / {entry.model}
              </span>
            </div>
            <div className="hist-actions">
              <button
                type="button"
                className={`hist-copy-btn ${justCopied ? 'copied' : ''}`}
                title="复制本条为 Markdown"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy();
                }}
              >
                {justCopied ? '已复制 ✓' : '复制'}
              </button>
              <button
                type="button"
                className="hist-del"
                title="删除这条"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div className="hist-selection">{entry.selection}</div>
          {!open && firstUser && (
            <div className="hist-preview">
              <span className="hist-role">你问：</span>
              {firstUser.content.split('\n').slice(-2).join(' ').slice(0, 120)}
              {firstUser.content.length > 120 && '…'}
            </div>
          )}
          {!open && firstAssistant && (
            <div className="hist-preview assistant">
              <span className="hist-role">模型：</span>
              {firstAssistant.content.slice(0, 140)}
              {firstAssistant.content.length > 140 && '…'}
            </div>
          )}
          {open && (
            <div className="hist-turns">
              {entry.turns.map((t, i) => (
                <div key={i} className={`hist-turn ${t.role}`}>
                  <div className="hist-role">{t.role === 'user' ? '你问' : '模型'}</div>
                  {t.role === 'assistant' ? (
                    <div
                      className="hist-content md-body"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(t.content) }}
                    />
                  ) : (
                    <div className="hist-content">{t.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = async () => {
    const arr = await loadHistory();
    setEntries(arr);
    setLoaded(true);
    // 同步：清掉已消失的 selected ids
    setSelected((prev) => {
      const alive = new Set(arr.map((e) => e.id));
      const next = new Set<string>();
      for (const id of prev) if (alive.has(id)) next.add(id);
      return next;
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter((e) => {
      if (e.selection.toLowerCase().includes(q)) return true;
      if (e.hostname.toLowerCase().includes(q)) return true;
      return e.turns.some((t) => t.content.toLowerCase().includes(q));
    });
  }, [entries, query]);

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.id)),
    [entries, selected]
  );

  const onDelete = async (id: string) => {
    await deleteHistoryEntry(id);
    void refresh();
  };

  const onClearAll = async () => {
    if (entries.length === 0) return;
    if (!confirm(`确认清空全部 ${entries.length} 条历史记录？此操作不可恢复。`)) return;
    await clearHistory();
    void refresh();
  };

  const onToggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSelectAllVisible = () => {
    const visibleIds = filtered.map((e) => e.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = visibleIds.every((id) => next.has(id));
      if (allSelected) {
        // 全部已选 → 取消可见项
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const onInvertSelect = () => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const e of filtered) if (!prev.has(e.id)) next.add(e.id);
      // 保留过滤外的原选中状态
      for (const id of prev) {
        if (!filtered.some((e) => e.id === id)) next.add(id);
      }
      return next;
    });
  };

  const onClearSelect = () => setSelected(new Set());

  const onDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确认删除选中的 ${selected.size} 条记录？此操作不可恢复。`)) return;
    for (const id of selected) {
      await deleteHistoryEntry(id);
    }
    void refresh();
  };

  const onExportMd = () => {
    if (selectedEntries.length === 0) return;
    exportMarkdownFile(selectedEntries);
  };

  const onExportJson = () => {
    if (selectedEntries.length === 0) return;
    exportJsonFile(selectedEntries);
  };

  const onCopyEntry = async (entry: HistoryEntry) => {
    try {
      await navigator.clipboard.writeText(formatEntryAsMarkdown(entry));
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((c) => (c === entry.id ? null : c)), 1400);
    } catch {
      alert('复制失败，浏览器拒绝了剪贴板访问。');
    }
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const hasSelection = selected.size > 0;

  return (
    <div>
      {/* 单一工具栏：无选中时显示 搜索+选择；选中后同行替换为批量操作 */}
      <div className={`hist-toolbar ${hasSelection ? 'bulk-mode' : ''}`}>
        {hasSelection ? (
          <>
            <span className="hist-bulk-info">已选 {selected.size} 条</span>
            <div className="hist-toolbar-spacer" />
            <button
              className="btn-ghost"
              type="button"
              onClick={onSelectAllVisible}
              disabled={filtered.length === 0}
              title={allVisibleSelected ? '取消勾选所有可见项' : '勾选所有可见项'}
            >
              {allVisibleSelected ? '取消全选' : '全选'}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={onInvertSelect}
              disabled={filtered.length === 0}
              title="在可见项中翻转选择"
            >
              反选
            </button>
            <button className="btn-ghost" type="button" onClick={onExportMd}>
              导出 Markdown
            </button>
            <button className="btn-ghost" type="button" onClick={onExportJson}>
              导出 JSON
            </button>
            <button className="btn-ghost danger" type="button" onClick={onDeleteSelected}>
              删除选中
            </button>
            <button className="btn-ghost" type="button" onClick={onClearSelect}>
              取消
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="搜索选中文字 / 站点 / 问答内容…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn-ghost"
              type="button"
              onClick={onSelectAllVisible}
              disabled={filtered.length === 0}
            >
              {allVisibleSelected ? '取消全选' : '全选'}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={onInvertSelect}
              disabled={filtered.length === 0}
            >
              反选
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={onClearAll}
              disabled={entries.length === 0}
            >
              清空全部
            </button>
          </>
        )}
      </div>

      {!loaded ? (
        <div className="hist-empty">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="hist-empty">
          {entries.length === 0
            ? '还没有历史记录。在气泡里问过的问答会自动出现在这里。'
            : '没有匹配的记录'}
        </div>
      ) : (
        <div className="hist-list">
          {filtered.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              selected={selected.has(e.id)}
              justCopied={copiedId === e.id}
              onToggleSelect={() => onToggleSelect(e.id)}
              onDelete={() => onDelete(e.id)}
              onCopy={() => onCopyEntry(e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
