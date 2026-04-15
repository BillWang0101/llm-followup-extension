# LLM 旁注追问 · Inline Follow-up for LLM Chats

> 在大模型对话网页里划词即问，答案就地浮现，不打断阅读。
> Select any text in an LLM reply and ask follow-ups in an inline bubble, without scrolling to the chat input.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](#)

---

## 中文说明

### 痛点

在 ChatGPT / Claude / Gemini / DeepSeek 等大模型网页上看长回答时，遇到陌生术语想追问，必须滚到底部输入框，问完又要翻回原段落——阅读线被一次次打断。

### 解决

划选回答里的任意文字 → **旁边立刻浮出一个追问气泡** → 输入追问 → 按 `Ctrl+Enter` → 答案就在气泡里**流式出现**。不切换焦点，不离开阅读位置。

### 两种追问模式

- **气泡内解答**（推荐）：直接调用你配置的 API Key，答案在气泡里流式返回。适合快速查术语、展开概念。
- **注入主对话**：把追问填入当前页面的输入框发送。复用你已登录的会话（ChatGPT / Claude 等），零额外成本。

### 功能

- 🎯 **划词即问**：选中文字后 <16ms 浮出气泡（自动避让屏幕边缘）
- 💬 **气泡内多轮对话**：答案下方常驻输入框，可一直追问下去
- 🔁 **嵌套追问**：气泡答案里再划词，点"追问这段"自动预填
- 🌐 **10 家 Provider**：OpenAI、Anthropic、Gemini、DeepSeek、Kimi、智谱 GLM、MiniMax、豆包、通义千问、硅基流动
- 🎨 **Linear 风格 UI**：深色优先，Inter 字体，半透明边框，自适应系统主题
- 🔒 **隐私优先**：API Key 仅存本地 `chrome.storage.sync`，无任何第三方遥测；详见 [PRIVACY.md](./PRIVACY.md)
- ⚙️ **权限最小化**：API 域走 `optional_host_permissions`，用到哪家才请求哪家

### 支持站点

ChatGPT · Claude · Gemini · DeepSeek · Kimi · 豆包 · 文心一言 · 通义千问

### 快捷键

| 动作 | 按键 |
|---|---|
| 发送追问 | `Ctrl+Enter` / `⌘+Enter` |
| 关闭气泡 | `Esc` |
| 打开设置 | 工具栏点扩展图标 → 设置 |

### 安装

**从商店安装（推荐）**
- Chrome Web Store：*（审核中）*
- Edge Add-ons：*（审核中）*

**从源码安装**
```bash
git clone <this-repo>
cd llm-followup-extension
npm install
npm run build
```
然后 `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序 → 选 `dist/` 目录。

### 配置

1. 点工具栏扩展图标 → **设置**
2. 选 Provider（任选一家你有 Key 的）
3. 粘贴 API Key
4. （首次使用）浏览器会弹窗请求访问该 Provider API 域的权限，点"允许"
5. 保存

### 开发

```bash
npm run dev          # Vite 热更
npm run build        # 生产构建
npm run build:icons  # 从 SVG 生成 png 图标
npm run package      # 产 dist-zip/llm-followup-extension-v*.zip（上架用）
```

### License

MIT — 见 [LICENSE](./LICENSE)

---

## English

### What it does

Adds a **selection-triggered follow-up bubble** to LLM chat pages (ChatGPT, Claude, Gemini, DeepSeek, Kimi, Zhipu GLM, MiniMax, Doubao, Qwen). Highlight any text in the model's response, ask a follow-up in the bubble, get a streaming answer right there. No scrolling, no context loss.

### Two modes

- **Answer-in-bubble** (recommended): calls your chosen API key, streams the answer inline.
- **Inject into main chat**: drops the follow-up into the page's chat input, reusing your logged-in session.

### Features

- Selection → bubble in under a frame; smart edge-avoiding placement
- Multi-turn chat inside the bubble with persistent history
- Nested follow-up: select text inside a bubble answer to drill deeper
- 10 providers (OpenAI, Anthropic, Gemini, DeepSeek, Kimi, Zhipu GLM, MiniMax, Doubao, Qwen, SiliconFlow), auto-routing via OpenAI-compatible schema + Anthropic's native API
- Linear-inspired dark-first UI with Inter Variable
- Local-only storage; no telemetry ([PRIVACY.md](./PRIVACY.md))
- Minimum permissions: API hosts are `optional_host_permissions`, requested per-provider on first use

### Install from source

```bash
npm install && npm run build
```
Load `dist/` as an unpacked extension at `chrome://extensions/`.

### License

MIT
