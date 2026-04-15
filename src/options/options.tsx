import '@fontsource-variable/inter';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_MODELS,
  DEFAULT_SETTINGS,
  PROVIDERS,
  type Provider,
  type Settings,
} from '../shared/types';
import { loadSettings, saveSettings } from '../shared/storage';
import { hasProviderPermission, requestProviderPermission } from '../shared/permissions';
import { Combobox } from './Combobox';
import { HistoryView } from './HistoryView';

type Tab = 'settings' | 'history';

function App() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [permStatus, setPermStatus] = useState<'ok' | 'needed' | 'denied' | 'checking'>('checking');
  const [tab, setTab] = useState<Tab>(
    location.hash === '#history' ? 'history' : 'settings'
  );

  useEffect(() => {
    const onHash = () => setTab(location.hash === '#history' ? 'history' : 'settings');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    void loadSettings().then(async (loaded) => {
      setS(loaded);
      const ok = await hasProviderPermission(loaded.apiProvider);
      setPermStatus(ok ? 'ok' : 'needed');
    });
  }, []);

  useEffect(() => {
    // 切 provider 时重新检查权限
    let cancel = false;
    setPermStatus('checking');
    void hasProviderPermission(s.apiProvider).then((ok) => {
      if (!cancel) setPermStatus(ok ? 'ok' : 'needed');
    });
    return () => { cancel = true; };
  }, [s.apiProvider]);

  return (
    <div>
      <h1>LLM 旁注追问</h1>
      <div className="subtitle">选中大模型回答里的文字，在旁边气泡里直接追问。</div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => {
            setTab('settings');
            history.replaceState(null, '', '#settings');
          }}
        >
          设置
        </button>
        <button
          type="button"
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setTab('history');
            history.replaceState(null, '', '#history');
          }}
        >
          历史记录
        </button>
      </div>

      {tab === 'history' ? <HistoryView /> : <SettingsPane
        s={s}
        setS={setS}
        saved={saved}
        setSaved={setSaved}
        permStatus={permStatus}
        setPermStatus={setPermStatus}
      />}
    </div>
  );
}

interface SettingsPaneProps {
  s: Settings;
  setS: React.Dispatch<React.SetStateAction<Settings>>;
  saved: boolean;
  setSaved: React.Dispatch<React.SetStateAction<boolean>>;
  permStatus: 'ok' | 'needed' | 'denied' | 'checking';
  setPermStatus: React.Dispatch<React.SetStateAction<'ok' | 'needed' | 'denied' | 'checking'>>;
}

function SettingsPane({ s, setS, saved, setSaved, permStatus, setPermStatus }: SettingsPaneProps) {
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const onProviderChange = (p: Provider) => {
    setS((prev) => ({
      ...prev,
      apiProvider: p,
      apiModel: DEFAULT_MODELS[p],
    }));
  };

  const onSave = async () => {
    await saveSettings(s);
    if (s.apiKey && permStatus !== 'ok') {
      const granted = await requestProviderPermission(s.apiProvider).catch(() => false);
      setPermStatus(granted ? 'ok' : 'denied');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onGrantPermission = async () => {
    const granted = await requestProviderPermission(s.apiProvider).catch(() => false);
    setPermStatus(granted ? 'ok' : 'denied');
  };

  const preset = PROVIDERS[s.apiProvider];

  return (
    <>
      <h2>通用</h2>
      <div className="section">
        <div className="field">
          <label className="toggle-row">
            <span>
              启用扩展
              <div className="hint" style={{ marginTop: 2 }}>
                关闭后划词不再浮出气泡。可随时回来开启。
              </div>
            </span>
            <input
              type="checkbox"
              className="toggle-switch"
              checked={s.enabled}
              onChange={(e) => update('enabled', e.target.checked)}
            />
          </label>
        </div>

        <div className="field">
          <label>默认追问模式</label>
          <select
            value={s.defaultMode}
            onChange={(e) => update('defaultMode', e.target.value as Settings['defaultMode'])}
          >
            <option value="api">气泡内解答（调用 API，不打断阅读）</option>
            <option value="inject">注入主对话（复用已登录会话）</option>
          </select>
        </div>
      </div>

      <h2>API（"气泡内解答"模式必填）</h2>
      <div className="section">
        <div className="row">
          <div className="field">
            <label>Provider</label>
            <select
              value={s.apiProvider}
              onChange={(e) => onProviderChange(e.target.value as Provider)}
            >
              {(Object.keys(PROVIDERS) as Provider[]).map((k) => (
                <option key={k} value={k}>
                  {PROVIDERS[k].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <Combobox
              key={s.apiProvider}
              value={s.apiModel}
              onChange={(v) => update('apiModel', v)}
              options={preset.models}
              placeholder={preset.defaultModel}
            />
          </div>
        </div>

        <div className="field">
          <label>API Key</label>
          <input
            type="password"
            value={s.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder={s.apiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
          />
          <div className="hint">
            Key 仅保存于 chrome.storage.sync，由后台 Service Worker 直接调用官方 API。
            {preset.consoleUrl && (
              <>
                {' · '}
                <a href={preset.consoleUrl} target="_blank" rel="noreferrer">
                  申请 {preset.label} Key →
                </a>
              </>
            )}
          </div>
        </div>

        <div className="field">
          <label>API 域授权</label>
          <div className="perm-row">
            <code className="perm-origin">{new URL(preset.endpoint).host}</code>
            {permStatus === 'ok' && <span className="perm-badge ok">✓ 已授权</span>}
            {permStatus === 'checking' && <span className="perm-badge">检查中…</span>}
            {(permStatus === 'needed' || permStatus === 'denied') && (
              <>
                <span className="perm-badge warn">
                  {permStatus === 'denied' ? '已拒绝' : '未授权'}
                </span>
                <button type="button" className="btn-ghost" onClick={onGrantPermission}>
                  立即授权
                </button>
              </>
            )}
          </div>
          <div className="hint">
            扩展按需请求访问 Provider API 域。未用到的家不占权限——行业最佳实践。
          </div>
        </div>
      </div>

      <h2>Prompt 模板</h2>
      <div className="section">
        <div className="field">
          <textarea
            value={s.promptTemplate}
            onChange={(e) => update('promptTemplate', e.target.value)}
          />
          <div
            className="hint"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>
              占位符：<code>{'{selection}'}</code> 选中文字 · <code>{'{context}'}</code> 所在段落 ·{' '}
              <code>{'{question}'}</code> 气泡里的输入
            </span>
            {s.promptTemplate !== DEFAULT_SETTINGS.promptTemplate && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update('promptTemplate', DEFAULT_SETTINGS.promptTemplate)}
              >
                恢复默认
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn-primary" onClick={onSave}>保存</button>
        {saved && <span className="saved">✓ 已保存</span>}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
