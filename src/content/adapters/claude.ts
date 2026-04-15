import type { SiteAdapter } from '../../shared/types';
import { injectContentEditable, clickSelector } from './dom-utils';

export const claudeAdapter: SiteAdapter = {
  id: 'claude',
  // 放宽：包含 assistant 消息的各种常见容器
  host: /(^|\.)claude\.ai$/,
  messageSelector: [
    '[data-testid="assistant-message"]',
    '[data-is-streaming]',
    '.font-claude-message',
    '.font-claude-response',
    'div.prose',
    '[data-test-render-count]',
  ].join(', '),
  inputSelector: [
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="Write"]',
    'div[contenteditable="true"][aria-label*="Reply"]',
    'div[contenteditable="true"]',
  ].join(', '),
  submitSelector: [
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'fieldset button[type="button"]:not([disabled])',
  ].join(', '),

  inject(text: string): boolean {
    const el = document.querySelector<HTMLElement>(this.inputSelector);
    if (!el) {
      console.warn('[llm-followup][claude] 找不到输入框', this.inputSelector);
      return false;
    }
    return injectContentEditable(el, text);
  },

  submit(): boolean {
    return clickSelector(this.submitSelector!);
  },
};
