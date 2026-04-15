import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Bubble } from './bubble/Bubble';
import { computeBubblePos } from './bubble/position';
import cssText from './bubble/styles.css?inline';
import { extractContext } from './context';
import { pickAdapter } from './adapters';
import { loadSettings, onSettingsChange } from '../shared/storage';
import { requestProviderPermission } from '../shared/permissions';
import { newEntryId, saveHistoryEntry } from '../shared/history';
import type { ChatMessage, PortMsg, Provider, Settings } from '../shared/types';

let settings: Settings | null = null;
let host: HTMLDivElement | null = null;
let root: Root | null = null;

const adapter = pickAdapter();
console.info('[llm-followup] loaded on', location.hostname, '→ adapter:', adapter.id);

async function init() {
  settings = await loadSettings();
  onSettingsChange((s) => {
    settings = s;
  });

  // 只在 mouseup / keyup 后触发——选区此时已最终确定，无需 debounce。
  // rAF 让浏览器先完成选区 repaint 再读取，避免抖动。
  document.addEventListener('mouseup', onFinalSelection, true);
  document.addEventListener('keyup', (e) => {
    // 仅键盘选区相关键触发
    if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      onFinalSelection();
    }
  }, true);

  document.addEventListener(
    'mousedown',
    (e) => {
      if (!host) return;
      if (e.composedPath().includes(host)) return;
      // 排除页面滚动条区域：滚动条 clientX 超出文档可视区宽度
      const de = document.documentElement;
      if (e.clientX >= de.clientWidth || e.clientY >= de.clientHeight) return;
      closeBubble();
    },
    true
  );
}

function onFinalSelection() {
  requestAnimationFrame(handleSelection);
}

function handleSelection() {
  if (!settings?.enabled) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;

  const text = sel.toString().trim();
  if (text.length < 2) return;

  // 点击气泡内部不重开
  if (host && sel.anchorNode && host.contains(sel.anchorNode as Node)) return;

  const { selection: selectionText, context, container } = extractContext(
    sel,
    adapter.messageSelector
  );
  if (!selectionText) return;
  if (!container) {
    console.debug('[llm-followup] 未命中 messageSelector，仍显示气泡（无上下文）');
  }

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const pos = computeBubblePos(rect);
  openBubble({ pos, selectionText, context });
}

function openBubble(args: {
  pos: { top: number; left: number };
  selectionText: string;
  context: string;
}) {
  closeBubble();

  host = document.createElement('div');
  host.id = 'llm-followup-host';
  host.style.cssText =
    'all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = cssText;
  shadow.appendChild(style);
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  document.body.appendChild(host);

  const canInject = adapter.id !== 'generic';
  const hasApiKey = !!settings!.apiKey;
  // 每次开气泡生成一个 sessionId；同一气泡里的多轮都用它 upsert 同一条历史记录
  const sessionId = newEntryId();
  const createdAt = Date.now();

  root = createRoot(mount);
  root.render(
    createElement(Bubble, {
      pos: args.pos,
      selection: args.selectionText,
      context: args.context,
      promptTemplate: settings!.promptTemplate,
      canInject,
      hasApiKey,
      onInject: (question) => doInject(question, args.selectionText),
      onAsk: (messages, cb) => startStream(messages, cb),
      onOpenOptions: () => {
        chrome.runtime.sendMessage({ type: 'open_options' }).catch(() => {});
      },
      onGrantPermission: (provider: Provider) => requestProviderPermissionFromContent(provider),
      onPersist: (turns: ChatMessage[]) => {
        void saveHistoryEntry({
          id: sessionId,
          createdAt,
          updatedAt: Date.now(),
          hostname: location.hostname,
          selection: args.selectionText,
          turns,
          provider: settings!.apiProvider,
          model: settings!.apiModel,
        });
      },
      onClose: closeBubble,
    })
  );
}

function closeBubble() {
  if (root) {
    try { root.unmount(); } catch {}
    root = null;
  }
  if (host && host.parentNode) host.parentNode.removeChild(host);
  host = null;
}

async function doInject(question: string, selectionText: string) {
  // 注入模式：上下文已在页面对话里，不要再重复整段。
  // 若用户输入没提到选中文字，末尾加一个轻量引用。
  const q = question.trim();
  const text = q.includes(selectionText)
    ? q
    : `${q}（指上文中的「${selectionText}」）`;
  const ok = adapter.inject(text);
  if (!ok) throw new Error('无法定位到输入框（站点可能改版）');
  await new Promise((r) => setTimeout(r, 80));
  if (!adapter.submit()) {
    console.warn('[llm-followup] 已填入输入框，但未找到发送按钮，请手动按回车');
  }
  closeBubble();
}

/**
 * 在气泡 click 的 user gesture 上下文里直接请求权限（MV3 允许 content script 调）。
 */
function requestProviderPermissionFromContent(provider: Provider): Promise<boolean> {
  return requestProviderPermission(provider).catch(() => false);
}

function startStream(
  messages: ChatMessage[],
  cb: {
    onChunk: (t: string) => void;
    onDone: () => void;
    onError: (m: string) => void;
    onNeedKey: () => void;
    onNeedPermission: (provider: Provider) => void;
  }
) {
  const port = chrome.runtime.connect({ name: 'ask' });
  let settled = false;

  port.onMessage.addListener((msg: PortMsg) => {
    if (settled) return;
    if (msg.type === 'chunk') cb.onChunk(msg.text);
    else if (msg.type === 'done') {
      settled = true;
      cb.onDone();
      try { port.disconnect(); } catch {}
    } else if (msg.type === 'need_key') {
      settled = true;
      cb.onNeedKey();
      try { port.disconnect(); } catch {}
    } else if (msg.type === 'need_permission') {
      settled = true;
      cb.onNeedPermission(msg.provider);
      try { port.disconnect(); } catch {}
    } else if (msg.type === 'error') {
      settled = true;
      cb.onError(msg.message);
      try { port.disconnect(); } catch {}
    }
  });

  port.onDisconnect.addListener(() => {
    if (!settled) {
      settled = true;
      cb.onError('连接断开');
    }
  });

  port.postMessage({ type: 'start', messages } satisfies PortMsg);

  return {
    cancel: () => {
      if (settled) return;
      settled = true;
      try {
        port.postMessage({ type: 'cancel' } satisfies PortMsg);
        port.disconnect();
      } catch {}
    },
  };
}

void init();
