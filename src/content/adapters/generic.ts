import type { SiteAdapter } from '../../shared/types';

/** 兜底 adapter：只允许"复制到剪贴板"，无法注入输入框 */
export const genericAdapter: SiteAdapter = {
  id: 'generic',
  host: /.*/,
  messageSelector: 'article, main, [role="article"], .markdown, .prose',
  inputSelector: 'textarea',

  inject(text: string): boolean {
    void navigator.clipboard.writeText(text).catch(() => {});
    return false;
  },

  submit(): boolean {
    return false;
  },
};
