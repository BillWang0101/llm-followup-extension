import DOMPurify from 'dompurify';
import { marked } from 'marked';

// 同步解析，流式渲染时对部分未闭合语法容错（marked 会自适应）
marked.use({
  gfm: true,
  breaks: true,
  async: false,
});

/**
 * 把 LLM 返回的 markdown 文本渲染为安全 HTML。
 * LLM 输出不可信，务必走 DOMPurify 过滤掉 script/iframe 等危险元素。
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';
  const html = marked.parse(text) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
