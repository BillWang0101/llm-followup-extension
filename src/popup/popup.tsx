import '@fontsource-variable/inter';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types';
import { loadSettings } from '../shared/storage';

const SUPPORTED = [
  { host: 'chatgpt.com', label: 'ChatGPT' },
  { host: 'chat.openai.com', label: 'ChatGPT' },
  { host: 'claude.ai', label: 'Claude' },
  { host: 'gemini.google.com', label: 'Gemini' },
  { host: 'chat.deepseek.com', label: 'DeepSeek' },
  { host: 'kimi.moonshot.cn', label: 'Kimi' },
  { host: 'kimi.com', label: 'Kimi' },
  { host: 'doubao.com', label: '豆包' },
  { host: 'tongyi.aliyun.com', label: '通义' },
];

function App() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [host, setHost] = useState<string>('');

  useEffect(() => {
    void loadSettings().then(setS);
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url;
      if (url) {
        try { setHost(new URL(url).hostname); } catch {}
      }
    });
  }, []);

  const supported = SUPPORTED.find((x) => host.endsWith(x.host));

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openHistory = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html#history') });
  };

  return (
    <div>
      <h1>LLM 旁注追问</h1>

      <div className="row">
        <span className="label">状态</span>
        <span className={`pill ${s.enabled ? '' : 'off'}`}>
          <span className="dot" />
          {s.enabled ? '已启用' : '已关闭'}
        </span>
      </div>

      <div className="row">
        <span className="label">当前页</span>
        <span className="value">
          {supported ? `✓ ${supported.label}` : host ? `${host}` : '—'}
        </span>
      </div>

      <div className="row">
        <span className="label">默认模式</span>
        <span className="value">
          {s.defaultMode === 'inject' ? '注入主对话' : '气泡内解答'}
        </span>
      </div>

      <hr />

      <div className="muted">
        在模型回答里 <kbd>选中文字</kbd> → 旁边浮出气泡 → 输入追问 → <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 发送
      </div>

      <hr />

      <div className="btn-group">
        <button className="btn" style={{ flex: 1 }} onClick={openHistory}>
          历史
        </button>
        <button className="btn primary" style={{ flex: 1 }} onClick={openOptions}>
          设置
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
