import type { SiteAdapter } from '../../shared/types';
import { injectTextarea, clickSelector } from './dom-utils';

export const deepseekAdapter: SiteAdapter = {
  id: 'deepseek',
  host: /(^|\.)chat\.deepseek\.com$/,
  messageSelector: '.ds-markdown, [class*="message"][class*="assistant"]',
  inputSelector: 'textarea#chat-input, textarea',
  submitSelector: 'div[role="button"][aria-disabled="false"]',

  inject(text: string): boolean {
    const el = document.querySelector<HTMLTextAreaElement>(this.inputSelector);
    if (!el) return false;
    return injectTextarea(el, text);
  },

  submit(): boolean {
    return clickSelector(this.submitSelector!);
  },
};
