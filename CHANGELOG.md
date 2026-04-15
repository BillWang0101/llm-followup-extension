# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-04-15

### Added
- 划词气泡 UI：在 LLM 回答里选中文字后在旁边浮出追问气泡
- 两种追问模式：气泡内解答（调 API）/ 注入主对话（复用已登录会话）
- 气泡内多轮对话 + 嵌套"追问这段"
- 9 家 provider 支持：OpenAI、Anthropic、Gemini、DeepSeek、Kimi、智谱 GLM、MiniMax、豆包、通义千问
- 流式输出（SSE），支持中途停止
- 历史自动截断（>8000 字符时 FIFO 丢弃中间轮次）
- Linear 风格深色优先 UI，系统主题自适应
- 设置页：provider 选择、model combobox（推荐下拉 + 自定义输入）、API Key、Prompt 模板
- 工具栏 popup：启用/关闭、状态、当前页支持情况
- 站点 adapter：ChatGPT / Claude / DeepSeek / Kimi（其余站点气泡仍可用，仅注入模式走兜底）

### Security
- API Key 仅保存于 `chrome.storage.sync`，从不上传到非 Provider 官方端点
- API 域走 `optional_host_permissions`，运行时按 provider 请求授权
- Inter 字体本地打包，零外部 CDN 依赖（MV3 CSP 合规）
