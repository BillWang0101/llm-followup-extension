# 商店截图指引 · Screenshots

Chrome Web Store 和 Edge Add-ons 上架都要求 **至少 1 张** 截图，推荐 **3–5 张**。

## 规格

- **尺寸**：`1280 × 800` 或 `640 × 400`（Chrome 推荐前者）
- **格式**：PNG 或 JPG（PNG 质感更好）
- **比例**：必须严格 16:10，否则会被拒
- **文件名**：建议 `01-selection.png`、`02-bubble-api.png` …

## 建议的 5 张截图

| # | 场景 | 怎么截 |
|---|---|---|
| 01 | **划词瞬间** | 在 ChatGPT 或 Claude 随便让它回答点东西，选中一个术语，气泡刚出现的那一帧 |
| 02 | **气泡内流式解答** | 上一张再往后一点，气泡里已经在流式渲染答案、光标在闪 |
| 03 | **多轮追问** | 在气泡下方常驻输入框再问一句，展示两条 user + assistant 消息 |
| 04 | **嵌套追问** | 在气泡答案里划词，展示"追问这段"小按钮 |
| 05 | **设置页** | Options 页全貌：Provider 下拉 + Model combobox 展开 + API Key 输入 |

## 工具

- **Windows**：Snipaste / ShareX / Win+Shift+S
- **macOS**：⌘⇧4 区域截图
- **Linux**：Flameshot / GNOME Screenshot

## 裁剪到 1280×800

截完用任何图片编辑器（甚至 Windows 画图）裁成 1280×800 即可。重点是保持 16:10。

## 放哪

把最终 PNG 都放在这个目录（`store-listing/screenshots/`）下。上架时一张张拖进商店 Dashboard 即可。
