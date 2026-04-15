import type { SiteAdapter } from '../../shared/types';
import { injectContentEditable, clickSelector } from './dom-utils';

export const kimiAdapter: SiteAdapter = {
  id: 'kimi',
  host: /(^|\.)kimi\.moonshot\.cn$|(^|\.)kimi\.com$/,
  messageSelector: '.markdown, [class*="assistant"]',
  inputSelector: 'div[contenteditable="true"], textarea',
  submitSelector: '[class*="send"][class*="button"], button[aria-label*="发送"]',

  inject(text: string): boolean {
    const el = document.querySelector<HTMLElement>(this.inputSelector);
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') {
      (el as HTMLTextAreaElement).focus();
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      setter?.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return injectContentEditable(el, text);
  },

  submit(): boolean {
    return clickSelector(this.submitSelector!);
  },
};
