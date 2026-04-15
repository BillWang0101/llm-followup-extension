import { loadSettings } from '../shared/storage';
import { hasProviderPermission } from '../shared/permissions';
import { PROVIDERS, type ChatMessage, type PortMsg, type Settings } from '../shared/types';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'open_options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ask') return;

  const ctrl = new AbortController();
  let started = false;

  port.onDisconnect.addListener(() => ctrl.abort());

  port.onMessage.addListener(async (msg: PortMsg) => {
    if (msg.type === 'cancel') {
      ctrl.abort();
      return;
    }
    if (msg.type !== 'start' || started) return;
    started = true;

    const settings = await loadSettings();
    if (!settings.apiKey) {
      port.postMessage({ type: 'need_key' } satisfies PortMsg);
      return;
    }

    if (!(await hasProviderPermission(settings.apiProvider))) {
      port.postMessage({
        type: 'need_permission',
        provider: settings.apiProvider,
      } satisfies PortMsg);
      return;
    }

    try {
      await streamProvider(settings, msg.messages, ctrl.signal, (text) =>
        port.postMessage({ type: 'chunk', text } satisfies PortMsg)
      );
      port.postMessage({ type: 'done' } satisfies PortMsg);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      port.postMessage({
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
      } satisfies PortMsg);
    }
  });
});

async function streamProvider(
  s: Settings,
  messages: ChatMessage[],
  signal: AbortSignal,
  onChunk: (t: string) => void
) {
  const preset = PROVIDERS[s.apiProvider];
  if (!preset) throw new Error(`未知 provider: ${s.apiProvider}`);
  if (preset.anthropic) return streamAnthropic(s, preset.endpoint, messages, signal, onChunk);
  return streamOpenAICompatible(s, preset.endpoint, messages, signal, onChunk);
}

async function streamOpenAICompatible(
  s: Settings,
  url: string,
  messages: ChatMessage[],
  signal: AbortSignal,
  onChunk: (t: string) => void
) {
  const resp = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${s.apiKey}`,
    },
    body: JSON.stringify({ model: s.apiModel, stream: true, messages }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP ${resp.status} ${await safeText(resp)}`);
  }

  await readSSE(resp.body, signal, (event) => {
    if (event === '[DONE]') return;
    try {
      const json = JSON.parse(event);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') onChunk(delta);
    } catch {}
  });
}

async function streamAnthropic(
  s: Settings,
  url: string,
  messages: ChatMessage[],
  signal: AbortSignal,
  onChunk: (t: string) => void
) {
  const resp = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': s.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: s.apiModel,
      max_tokens: 1024,
      stream: true,
      messages,
    }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP ${resp.status} ${await safeText(resp)}`);
  }

  await readSSE(resp.body, signal, (event) => {
    try {
      const json = JSON.parse(event);
      if (json.type === 'content_block_delta') {
        const t = json.delta?.text;
        if (typeof t === 'string') onChunk(t);
      }
    } catch {}
  });
}

async function readSSE(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onEvent: (data: string) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split('\n')) {
        if (line.startsWith('data: ')) onEvent(line.slice(6).trim());
      }
    }
  }
}

async function safeText(r: Response): Promise<string> {
  try {
    return (await r.text()).slice(0, 300);
  } catch {
    return '';
  }
}

export {};
