export type AskMode = 'inject' | 'api';

export interface SiteAdapter {
  /** 站点标识 */
  id: string;
  /** host 匹配（字符串精确或正则） */
  host: RegExp;
  /** 判定选区是否落在"模型回答"消息容器里的 selector */
  messageSelector: string;
  /** 页面主输入框 selector */
  inputSelector: string;
  /** 可选：发送按钮 selector */
  submitSelector?: string;
  /** 把文本写入输入框（需触发框架状态更新） */
  inject(text: string): boolean;
  /** 提交 */
  submit(): boolean;
}

export type Provider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'kimi'
  | 'zhipu'
  | 'minimax'
  | 'doubao'
  | 'qwen'
  | 'siliconflow';

export interface Settings {
  defaultMode: AskMode;
  apiProvider: Provider;
  apiKey: string;
  apiModel: string;
  promptTemplate: string;
  enabled: boolean;
}

export interface ProviderPreset {
  label: string;
  /** Chat completions endpoint (full URL) */
  endpoint: string;
  defaultModel: string;
  /** 推荐模型列表（下拉候选，允许用户自由输入不在列表里的新模型） */
  models: string[];
  /** 若为 anthropic，走不同的鉴权和事件格式 */
  anthropic?: boolean;
  /** API Key 申请页 */
  consoleUrl?: string;
}

export const PROVIDERS: Record<Provider, ProviderPreset> = {
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
    models: [
      'gpt-5.4-mini',
      'gpt-5.4',
      'gpt-5.4-nano',
      'gpt-5.2',
      'gpt-5.2-pro',
      'gpt-5.1',
      'gpt-5',
      'gpt-5-pro',
      'gpt-4.1-mini',
      'gpt-4.1',
      'gpt-4o-mini',
      'gpt-4o',
    ],
    consoleUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-haiku-4-5',
    models: [
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-sonnet-4-5',
      'claude-opus-4-5',
    ],
    anthropic: true,
    consoleUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.5-flash',
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-3.1-flash-lite-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-pro-preview',
    ],
    consoleUrl: 'https://aistudio.google.com/app/apikey',
  },
  deepseek: {
    label: 'DeepSeek 深度求索',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    // 官方只暴露两个 ID（都映射到 V3.2，128K 上下文）：
    // deepseek-chat      = V3.2 非思考模式（通用对话）
    // deepseek-reasoner  = V3.2 思考模式（推理/链式思考）
    models: ['deepseek-chat', 'deepseek-reasoner'],
    consoleUrl: 'https://platform.deepseek.com/api_keys',
  },
  kimi: {
    label: 'Kimi 月之暗面',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'kimi-latest',
    models: [
      'kimi-latest',
      'kimi-k2.5',
      'kimi-k2',
      'kimi-k2-thinking',
      'moonshot-v1-auto',
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  zhipu: {
    label: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-long', 'glm-4-plus', 'glm-4.5', 'glm-5', 'glm-5.1'],
    consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  minimax: {
    label: 'MiniMax',
    endpoint: 'https://api.minimaxi.com/v1/text/chatcompletion_v2',
    defaultModel: 'MiniMax-M2.7',
    models: ['MiniMax-M2.7', 'M2.7-highspeed', 'MiniMax-M1', 'MiniMax-Text-01'],
    consoleUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
  },
  doubao: {
    label: '豆包（火山方舟）',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    defaultModel: 'doubao-seed-2-0-pro-260215',
    // 豆包用模型 ID 或自建 endpoint（ep-xxxx）皆可
    models: [
      'doubao-seed-2-0-pro-260215',
      'doubao-1-5-lite-32k-250115',
      'doubao-1-5-pro-32k-250115',
      'doubao-1-5-pro-256k-250115',
      'doubao-1-5-thinking-pro-250415',
      'doubao-seed-1-6-250615',
    ],
    consoleUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
  },
  siliconflow: {
    label: '硅基流动 SiliconFlow',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    // 聚合平台，模型种类多，用 "厂商/模型名" 格式；用户可在 combobox 里自由输入
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen3-235B-A22B-Instruct-2507',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'THUDM/glm-4-9b-chat',
      'meta-llama/Meta-Llama-3.1-70B-Instruct',
      'internlm/internlm2_5-7b-chat',
      '01-ai/Yi-1.5-34B-Chat',
    ],
    consoleUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  qwen: {
    label: '通义千问（阿里百炼）',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen3.5-flash',
    models: [
      'qwen3.5-flash',
      'qwen3.5-plus',
      'qwen3-max',
      'qwen3-next-80b-a3b-instruct',
      'qwen3-next-80b-a3b-thinking',
      'qwen3-235b-a22b-instruct-2507',
      'qwen-turbo',
      'qwen-plus',
      'qwen-max',
    ],
    consoleUrl: 'https://bailian.console.aliyun.com/?apiKey=1',
  },
};

export const DEFAULT_MODELS: Record<Provider, string> = Object.fromEntries(
  Object.entries(PROVIDERS).map(([k, v]) => [k, v.defaultModel])
) as Record<Provider, string>;

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: 'api',
  apiProvider: 'openai',
  apiKey: '',
  apiModel: DEFAULT_MODELS.openai,
  promptTemplate:
    '上下文（来自一段 AI 回答）：\n{context}\n\n用户的问题，关于其中的「{selection}」：\n{question}',
  enabled: true,
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface HistoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  pageUrl: string;
  pageTitle: string;
  /** 最初划选的文字 */
  selection: string;
  turns: ChatMessage[];
  provider: Provider;
  model: string;
}

export type PortMsg =
  | { type: 'start'; messages: ChatMessage[] }
  | { type: 'chunk'; text: string }
  | { type: 'done' }
  | { type: 'need_key' }
  | { type: 'need_permission'; provider: Provider }
  | { type: 'error'; message: string }
  | { type: 'cancel' };
