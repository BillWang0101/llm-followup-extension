import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, Provider } from '../../shared/types';
import { renderMarkdown } from '../../shared/markdown';
import { loadBubbleSize, saveBubbleSize, type BubbleSize } from '../../shared/bubble-prefs';
import type { Pos } from './position';

const MIN_W = 300;
const MAX_W = 900;
const MIN_H = 220;
const EDGE = 8;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

type Phase = 'idle' | 'streaming' | 'need_key' | 'need_permission' | 'error';

interface StreamHandle {
  cancel: () => void;
}

interface StreamCallbacks {
  onChunk: (t: string) => void;
  onDone: () => void;
  onError: (m: string) => void;
  onNeedKey: () => void;
  onNeedPermission: (provider: Provider) => void;
}

interface Props {
  pos: Pos;
  /** 最初划选的那段文字 */
  selection: string;
  /** 所在消息段落（首轮上下文） */
  context: string;
  /** Prompt 模板（首轮组装用） */
  promptTemplate: string;
  canInject: boolean;
  hasApiKey: boolean;
  /** 模式 A：把首轮文本注入主对话 */
  onInject: (question: string) => Promise<void>;
  /** 模式 B：开启流式（传入完整 messages 数组） */
  onAsk: (messages: ChatMessage[], cb: StreamCallbacks) => StreamHandle;
  onOpenOptions: () => void;
  /** 用户手势触发授权（气泡里点击 → 通过 background 请求 permission） */
  onGrantPermission: (provider: Provider) => Promise<boolean>;
  /** 持久化当前会话到 history（每轮完成时调） */
  onPersist: (turns: ChatMessage[]) => void;
  onClose: () => void;
}

const HISTORY_CHAR_LIMIT = 8000;

function buildFirstUserContent(
  template: string,
  vars: { selection: string; context: string; question: string }
): string {
  return template
    .replaceAll('{selection}', vars.selection)
    .replaceAll('{context}', vars.context)
    .replaceAll('{question}', vars.question.trim());
}

/** 保留第一条 user（原始上下文），然后按 FIFO 丢中间轮次，直到总字符数低于阈值 */
function truncateHistory(turns: ChatMessage[]): ChatMessage[] {
  const totalLen = (arr: ChatMessage[]) => arr.reduce((n, m) => n + m.content.length, 0);
  if (turns.length <= 1 || totalLen(turns) <= HISTORY_CHAR_LIMIT) return turns;
  const [first, ...rest] = turns;
  const kept: ChatMessage[] = [];
  // 从尾部往前加，直到装不下
  for (let i = rest.length - 1; i >= 0; i--) {
    const candidate = [first, rest[i], ...kept];
    if (totalLen(candidate) > HISTORY_CHAR_LIMIT) break;
    kept.unshift(rest[i]);
  }
  return [first, ...kept];
}

export function Bubble({
  pos,
  selection,
  context,
  promptTemplate,
  canInject,
  hasApiKey,
  onInject,
  onAsk,
  onOpenOptions,
  onGrantPermission,
  onPersist,
  onClose,
}: Props) {
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('请解释');
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  // 拖拽位置（null = 用 pos 传入的初始位置）
  const [userPos, setUserPos] = useState<{ top: number; left: number } | null>(null);
  // 用户调过的尺寸（null = 自适应）
  const [userSize, setUserSize] = useState<BubbleSize | null>(null);

  // 加载上次保存的尺寸
  useEffect(() => {
    void loadBubbleSize().then((s) => s && setUserSize(s));
  }, []);
  // inject 模式还是 api 模式——仅在首轮生效，有对话后固定为 api
  const [firstMode, setFirstMode] = useState<'inject' | 'api'>(canInject ? 'api' : 'api');

  const taRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<StreamHandle | null>(null);
  /** 当前正在累积的 assistant 消息索引 */
  const streamingIdxRef = useRef<number | null>(null);
  /** Shadow DOM 内的选区（用于"追问这段"浮层） */
  const [quoteRect, setQuoteRect] = useState<{ top: number; left: number; text: string } | null>(null);

  const isFirstTurn = turns.length === 0;
  const hasApiTurns = turns.length > 0;

  useEffect(() => {
    taRef.current?.focus();
    taRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 流式滚底
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [turns]);

  // 监听气泡内 assistant 消息里的选区，浮出"追问这段"
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const shadow = thread.getRootNode() as ShadowRoot;
    const handler = () => {
      const sel = shadow.getSelection?.() ?? window.getSelection();
      if (!sel || sel.isCollapsed) {
        setQuoteRect(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setQuoteRect(null);
        return;
      }
      const node = sel.anchorNode as Node | null;
      const el = (node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement) ?? null;
      const inAssistant = el?.closest('.msg.assistant');
      if (!inAssistant) {
        setQuoteRect(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wrapRect = thread.getBoundingClientRect();
      setQuoteRect({
        top: rect.bottom - wrapRect.top + thread.scrollTop + 4,
        left: Math.max(4, rect.left - wrapRect.left),
        text,
      });
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const handleClose = () => {
    streamRef.current?.cancel();
    onClose();
  };

  const startStreamingFor = (messages: ChatMessage[]) => {
    setErr(null);
    // 先占位：push 空 assistant
    setTurns((prev) => {
      streamingIdxRef.current = prev.length;
      return [...prev, { role: 'assistant', content: '' }];
    });
    setPhase('streaming');

    streamRef.current = onAsk(messages, {
      onChunk: (t) => {
        setTurns((prev) => {
          const idx = streamingIdxRef.current;
          if (idx == null || idx >= prev.length) return prev;
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], content: copy[idx].content + t };
          return copy;
        });
      },
      onDone: () => {
        streamingIdxRef.current = null;
        setPhase('idle');
        setTimeout(() => taRef.current?.focus(), 0);
        // 持久化：读当前 state 的最新 turns
        setTurns((prev) => {
          onPersist(prev);
          return prev;
        });
      },
      onError: (m) => {
        streamingIdxRef.current = null;
        setErr(m);
        setPhase('error');
      },
      onNeedKey: () => {
        streamingIdxRef.current = null;
        setTurns((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
        setPhase('need_key');
      },
      onNeedPermission: (provider) => {
        streamingIdxRef.current = null;
        setTurns((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
        setPendingProvider(provider);
        setPhase('need_permission');
      },
    });
  };

  const handleSend = async () => {
    const q = draft.trim();
    if (!q || phase === 'streaming') return;

    if (isFirstTurn && firstMode === 'inject') {
      try {
        await onInject(q);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
      return;
    }

    // API 模式
    if (!hasApiKey) {
      setPhase('need_key');
      return;
    }

    const userContent = isFirstTurn
      ? buildFirstUserContent(promptTemplate, { selection, context, question: q })
      : q;

    const nextTurns: ChatMessage[] = [...turns, { role: 'user', content: userContent }];
    setTurns(nextTurns);
    setDraft('');

    startStreamingFor(truncateHistory(nextTurns));
  };

  const handleStop = () => {
    streamRef.current?.cancel();
    streamRef.current = null;
    // 标记已停止
    setTurns((prev) => {
      const idx = streamingIdxRef.current;
      if (idx == null || idx >= prev.length) return prev;
      const copy = prev.slice();
      const c = copy[idx].content;
      copy[idx] = { ...copy[idx], content: c + (c ? '\n\n[已停止]' : '[已停止]') };
      return copy;
    });
    streamingIdxRef.current = null;
    setPhase('idle');
  };

  const handleQuote = (text: string) => {
    setDraft(`请解释「${text}」`);
    setQuoteRect(null);
    setTimeout(() => {
      taRef.current?.focus();
      taRef.current?.select();
    }, 0);
  };

  const handleClear = () => {
    streamRef.current?.cancel();
    streamRef.current = null;
    streamingIdxRef.current = null;
    setTurns([]);
    setDraft('请解释');
    setErr(null);
    setPhase('idle');
  };

  const handleCopyAll = () => {
    const txt = turns
      .map((m) => (m.role === 'user' ? `> ${m.content}` : m.content))
      .join('\n\n');
    void navigator.clipboard.writeText(txt).catch(() => {});
  };

  const onTaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  };

  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseTop = userPos?.top ?? pos.top;
    const baseLeft = userPos?.left ?? pos.left;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = userSize?.w ?? 380;
    const h = userSize?.h ?? 300;

    const onMove = (ev: MouseEvent) => {
      const top = clamp(baseTop + ev.clientY - startY, EDGE, vh - h - EDGE);
      const left = clamp(baseLeft + ev.clientX - startX, EDGE, vw - w - EDGE);
      setUserPos({ top, left });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseW = userSize?.w ?? 380;
    // 初始高度：如果还没设置过，用 maxHeight 作为基准
    const baseH = userSize?.h ?? Math.min(pos.maxHeight, 480);
    const top = userPos?.top ?? pos.top;
    const left = userPos?.left ?? pos.left;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const onMove = (ev: MouseEvent) => {
      const w = clamp(baseW + ev.clientX - startX, MIN_W, Math.min(MAX_W, vw - left - EDGE));
      const h = clamp(baseH + ev.clientY - startY, MIN_H, vh - top - EDGE);
      setUserSize({ w, h });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // 持久化最终尺寸
      setUserSize((s) => {
        if (s) void saveBubbleSize(s);
        return s;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const turnCountHint = useMemo(() => {
    const n = turns.filter((m) => m.role === 'user').length;
    return n > 1 ? `多轮对话 · ${n} 轮` : null;
  }, [turns]);

  return (
    <div
      className="wrapper"
      style={{
        top: userPos?.top ?? pos.top,
        left: userPos?.left ?? pos.left,
        width: userSize?.w ?? undefined,
        // userSize 优先用 height；否则用 maxHeight 让 card 按内容自适应
        height: userSize?.h ?? undefined,
        maxHeight: userSize ? undefined : pos.maxHeight,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="card">
        <div
          className="drag-handle"
          onMouseDown={onDragStart}
          title="按住拖动气泡"
          aria-label="拖拽手柄"
        >
          <span className="drag-handle-grip" />
        </div>
        <div className="selection" title={selection}>
          {selection}
        </div>

        {phase === 'need_key' ? (
          <div className="need-key">
            <div className="hint">尚未配置 API Key。气泡内解答需要先在设置里填 Key。</div>
            <div className="row">
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setPhase('idle')}>
                返回
              </button>
              <button className="btn primary" type="button" onClick={onOpenOptions}>
                去配置
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'need_permission' && pendingProvider ? (
          <div className="need-key">
            <div className="hint">
              首次使用需授权访问 <code>{pendingProvider}</code> API 域。点"授权"弹出浏览器权限提示。
            </div>
            <div className="row">
              <div className="spacer" />
              <button className="btn" type="button" onClick={() => setPhase('idle')}>
                返回
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={async () => {
                  const ok = await onGrantPermission(pendingProvider);
                  if (ok) {
                    setPhase('idle');
                    setPendingProvider(null);
                  }
                }}
              >
                授权
              </button>
            </div>
          </div>
        ) : null}

        {phase !== 'need_key' && phase !== 'need_permission' && (
          <div className={`thread ${hasApiTurns ? '' : 'empty'}`} ref={threadRef}>
            {!hasApiTurns && (
              <div className="thread-empty-hint">答案会出现在这里</div>
            )}
            {turns.map((m, i) => {
              const isStreaming = phase === 'streaming' && i === streamingIdxRef.current;
              const empty = !m.content;
              if (m.role === 'assistant') {
                return (
                  <div key={i} className={`msg ${m.role} md`}>
                    {empty && isStreaming ? (
                      <span className="hist-muted">生成中…</span>
                    ) : (
                      <span
                        className="md-body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                    )}
                    {isStreaming && <span className="cursor">▍</span>}
                  </div>
                );
              }
              return (
                <div key={i} className={`msg ${m.role}`}>
                  {m.content}
                </div>
              );
            })}
            {quoteRect && (
              <button
                type="button"
                className="quote-action"
                style={{ top: quoteRect.top, left: quoteRect.left }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleQuote(quoteRect.text);
                }}
              >
                追问这段
              </button>
            )}
          </div>
        )}

        {phase !== 'need_key' && phase !== 'need_permission' && (
          <>
            <textarea
              ref={taRef}
              className="textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onTaKey}
              placeholder={
                hasApiTurns
                  ? '继续追问…（Ctrl+Enter 发送）'
                  : '追问这段内容…（Ctrl+Enter 发送，Esc 关闭）'
              }
              disabled={phase === 'streaming'}
            />

            <div className="row">
              {isFirstTurn ? (
                <div className="mode" role="tablist" aria-label="首轮模式">
                  <button
                    type="button"
                    className={firstMode === 'api' ? 'active' : ''}
                    onClick={() => setFirstMode('api')}
                    title="直接调用 API，在气泡内返回"
                  >
                    气泡内解答
                  </button>
                  <button
                    type="button"
                    className={firstMode === 'inject' ? 'active' : ''}
                    disabled={!canInject}
                    title={canInject ? '把追问发到当前对话' : '当前站点暂不支持注入'}
                    onClick={() => setFirstMode('inject')}
                  >
                    注入主对话
                  </button>
                </div>
              ) : (
                <span className="hint" style={{ margin: 0 }}>{turnCountHint}</span>
              )}

              <div className="spacer" />

              {hasApiTurns && (
                <>
                  <button className="btn" type="button" onClick={handleCopyAll} title="复制全部">
                    复制
                  </button>
                  <button className="btn" type="button" onClick={handleClear} title="清空对话">
                    清空
                  </button>
                </>
              )}

              {phase === 'streaming' ? (
                <button className="btn" type="button" onClick={handleStop}>
                  停止
                </button>
              ) : (
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                >
                  发送
                </button>
              )}

              <button className="btn" type="button" onClick={handleClose} title="关闭">
                ✕
              </button>
            </div>

            {phase === 'error' && err && <div className="hint err">出错：{err}</div>}
          </>
        )}

        <div
          className="resize-handle"
          onMouseDown={onResizeStart}
          title="拖动调整大小"
          aria-label="缩放手柄"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M13 7L7 13M13 11L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
