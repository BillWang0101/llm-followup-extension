import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

// 聊天站点（content script 必须静态声明）
const CHAT_SITES = [
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://claude.ai/*',
  'https://gemini.google.com/*',
  'https://chat.deepseek.com/*',
  'https://kimi.moonshot.cn/*',
  'https://www.kimi.com/*',
  'https://www.doubao.com/*',
  'https://yiyan.baidu.com/*',
  'https://tongyi.aliyun.com/*',
];

// Provider API 域（按需授权，不预占权限）
const API_HOSTS = [
  'https://api.openai.com/*',
  'https://api.anthropic.com/*',
  'https://generativelanguage.googleapis.com/*',
  'https://api.deepseek.com/*',
  'https://api.moonshot.cn/*',
  'https://open.bigmodel.cn/*',
  'https://api.minimaxi.com/*',
  'https://ark.cn-beijing.volces.com/*',
  'https://dashscope.aliyuncs.com/*',
  'https://api.siliconflow.cn/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'LLM 旁注追问',
  version: pkg.version,
  description: pkg.description,
  author: { email: 'wangjc01@foxmail.com' },
  homepage_url: 'https://github.com/BillWang0101/llm-followup-extension',
  action: {
    default_title: 'LLM 旁注追问',
    default_popup: 'src/popup/popup.html',
  },
  options_page: 'src/options/options.html',
  permissions: ['storage', 'activeTab'],
  host_permissions: CHAT_SITES,
  optional_host_permissions: API_HOSTS,
  background: {
    service_worker: 'src/background/sw.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: CHAT_SITES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  icons: {
    '16': 'public/icons/icon16.png',
    '48': 'public/icons/icon48.png',
    '128': 'public/icons/icon128.png',
  },
});
