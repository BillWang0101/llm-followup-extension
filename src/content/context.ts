const MAX_CONTEXT = 2000;
const MAX_SELECTION = 500;

/** 去除连续重复行（常见于站点把 "thinking/status" 和正文都渲染到 DOM） */
function dedupConsecutiveLines(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      out.length > 0 &&
      out[out.length - 1].trim() === trimmed
    ) {
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** 从 Selection 里抽取上下文：选中文本 + 所在消息段落 */
export function extractContext(
  selection: Selection,
  messageSelector: string
): { selection: string; context: string; container: HTMLElement | null } {
  const selText = selection.toString().trim().slice(0, MAX_SELECTION);

  const anchor = selection.anchorNode;
  if (!anchor) return { selection: selText, context: '', container: null };

  const node: Node | null = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
  const container = (node as HTMLElement | null)?.closest(messageSelector) as HTMLElement | null;

  const raw = dedupConsecutiveLines(container?.innerText ?? '');
  const context = raw.length > MAX_CONTEXT ? raw.slice(0, MAX_CONTEXT) + '…' : raw;

  return { selection: selText, context, container };
}

export function buildPrompt(
  template: string,
  vars: { selection: string; context: string; question: string }
): string {
  return template
    .replaceAll('{selection}', vars.selection)
    .replaceAll('{context}', vars.context)
    .replaceAll('{question}', vars.question.trim());
}
