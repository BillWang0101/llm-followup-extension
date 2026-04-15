/** 注入到 <textarea> 或 <input>，触发 React 能识别的 input 事件 */
export function injectTextarea(el: HTMLTextAreaElement | HTMLInputElement, text: string): boolean {
  el.focus();
  const proto =
    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) return false;
  setter.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/** 注入到 contenteditable：清空后用 insertText 让 ProseMirror / Lexical 都能接收 */
export function injectContentEditable(el: HTMLElement, text: string): boolean {
  el.focus();

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.addRange(range);
  }

  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }

  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  }

  return true;
}

export function clickSelector(selector: string): boolean {
  const btn = document.querySelector<HTMLElement>(selector);
  if (!btn) return false;
  btn.click();
  return true;
}
