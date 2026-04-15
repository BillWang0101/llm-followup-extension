# Privacy Policy · 隐私政策

**Last updated / 最近更新：2026-04-15**

---

## 简体中文

### 总原则
LLM 旁注追问（以下简称"本扩展"）**不收集、不上传、不分享**任何用户数据。所有数据处理都在你的浏览器本地和你主动选择的大模型 API 提供商之间直接进行。

### 本扩展存储的数据
- **API Key、Provider 选择、默认模型、Prompt 模板、启用开关** —— 仅保存在 `chrome.storage.sync`（由 Chrome 管理的本地存储，可选择性同步到你自己 Google 账号下）。**本扩展的开发者无法访问这些数据。**

### 本扩展发送的网络请求
只有一种：当你在气泡里点发送且选了"气泡内解答"模式时，**由浏览器扩展的 Service Worker** 向**你在设置中选定的 Provider 的官方 API 端点**（如 `https://api.openai.com/...`、`https://api.anthropic.com/...`）发起一次 HTTPS 请求，请求体包含你的追问文本和 API Key。

- 请求**不经过任何第三方服务器**。
- 请求的目的地由你的设置决定。
- 返回的流式响应只渲染在气泡里，不持久化，不上报。

### 本扩展读取的页面数据
- 当你**主动划词**时，扩展会读取你选中的文本 + 所在消息段落（不超过 2000 字符）作为 prompt 上下文。
- 这些内容**仅用于构造发送给 Provider API 的请求**，不存储、不上传到任何其他地方。
- 扩展**不会**在后台扫描或记录网页内容。

### 权限说明
- `storage`：读写上述配置项。
- `activeTab`：获取当前标签页的 hostname（用于 popup 显示"当前页是否被适配"）。
- `host_permissions`（页面域，如 `claude.ai`、`chatgpt.com` 等）：允许 content script 在这些站点运行以监听划词。
- `optional_host_permissions`（API 域，如 `api.openai.com`）：**运行时按需请求**，你在选项页选了哪家 Provider 才请求哪家。未请求的 API 域扩展无法访问。

### Cookie / 跟踪 / 广告
无。本扩展不写 cookie，不含任何分析 SDK、不接广告。

### 数据保留
所有配置永远存在你本地，直到你手动在扩展设置里清空或卸载扩展。卸载扩展会清除所有本地数据。

### 联系方式
若发现隐私相关问题，请到项目 GitHub Issues 报告。

---

## English

### Principle
LLM Follow-up ("the Extension") **does not collect, transmit, or share any user data**. All processing happens locally in your browser or between your browser and the LLM API provider you explicitly chose.

### Data stored
- **API Key, provider selection, default model, prompt template, enable toggle** — stored only in `chrome.storage.sync` (Chrome's sandboxed local storage, optionally syncable to your own Google account). The author of this extension has no access to this data.

### Network requests made
One kind only: when you click Send in the bubble with "Answer in bubble" mode, the extension's background Service Worker sends an HTTPS request to **the official API endpoint of the provider you selected in Settings** (e.g. `https://api.openai.com/...`). The request body contains your follow-up text and your API Key.
- Requests **never** go through any third-party server.
- Destination is fully determined by your settings.
- Streaming responses are rendered in the bubble only; not stored or reported anywhere.

### Page data accessed
- When you **actively select text**, the extension reads the selection plus its containing message block (≤2000 chars) to build the prompt context.
- These are used **only** to construct the request to your chosen provider. No persistence, no upload elsewhere.
- The extension does **not** scan or log page contents in the background.

### Permissions
- `storage`: stores your settings.
- `activeTab`: reads current tab hostname so the popup can show whether the current site is supported.
- `host_permissions` (chat sites like `claude.ai`, `chatgpt.com`): allows the content script to run on these sites to handle selection.
- `optional_host_permissions` (API domains like `api.openai.com`): **requested at runtime on a per-provider basis**. The extension cannot access an API domain you haven't authorized.

### Cookies / Tracking / Ads
None. The extension sets no cookies, bundles no analytics SDK, shows no ads.

### Data retention
All settings live in your local browser until you clear them in settings or uninstall the extension. Uninstalling clears everything.

### Contact
Report privacy concerns via the project's GitHub Issues.
