import type { SiteAdapter } from '../../shared/types';
import { injectContentEditable, clickSelector } from './dom-utils';

export const chatgptAdapter: SiteAdapter = {
  id: 'chatgpt',
  host: /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/,
  messageSelector: '[data-message-author-role="assistant"]',
  inputSelector: '#prompt-textarea',
  submitSelector: 'button[data-testid="send-button"]',

  inject(text: string): boolean {
    const el = document.querySelector<HTMLElement>(this.inputSelector);
    if (!el) return false;
    return injectContentEditable(el, text);
  },

  submit(): boolean {
    return clickSelector(this.submitSelector!);
  },
};
