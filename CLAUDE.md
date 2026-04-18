# DevTidy — 虛擬環境管理器

## 專案概述
跨平台桌面應用，掃描並管理電腦上的虛擬環境（Python venv/conda/uv、Node.js node_modules）。
技術棧：Tauri v2 (Rust) + React 19 + TypeScript + shadcn/ui + Tailwind CSS v4

## Obsidian 筆記（必須維護）
每次實作功能、修復 bug、或完成任務時，必須同步更新 Obsidian 筆記：

- **專案計畫：** `/Users/hong/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian-vault/02-Projects/DevTidy/DevTidy.md`
- **Kanban Board：** `/Users/hong/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian-vault/02-Projects/DevTidy/DevTidy-Tasks.md`

### Kanban Board 格式
使用 Obsidian Kanban 插件格式，任務開頭必須標注 tag：
- `#dev/feature` — 新功能
- `#dev/bug` — Bug 修復
- `#dev/enhancement` — 既有功能改善
- `#dev/eval` — 評估/測試任務
- `#dev/doc` — 文件撰寫
- `#dev/refactor` — 程式碼重構

範例：`- [ ] #dev/feature Node.js 環境掃描功能`

### 任務狀態更新流程
1. 開始開發 → 任務從 `Todo` 移至 `In Progress`
2. 開發完成 → 任務移至 `Code Review`
3. Code review 通過 → 任務移至 `Complete`
4. 開發中發現新任務 → 加到 `Todo` 並標注適當 tag
5. 架構決策或實驗結果 → 記錄到 DevTidy.md

## Git 開發流程（企業級標準）

### 分支策略
- `main` — 穩定版本，僅透過 PR 合併
- `develop` — 開發主線
- `feature/<功能名>` — 功能分支，從 `develop` 分出
- `fix/<bug描述>` — Bug 修復分支
- `refactor/<重構描述>` — 重構分支

### 分支命名規則
```
feature/rust-scanner-engine
feature/frontend-env-table
fix/macos-permission-detection
refactor/ipc-command-structure
```

### Commit Message 格式
```
<type>(<scope>): <description>

<optional body>
```

**Type：** feat, fix, refactor, docs, test, chore, perf, ci
**Scope：** scanner, frontend, ipc, db, theme, i18n, build

範例：
```
feat(scanner): 實作 Python venv 環境偵測
fix(frontend): 修正深色主題下表格邊框顏色
test(scanner): 新增 conda 環境偵測單元測試
```

### 開發流程（每個功能必須遵循）
1. **建立分支** — 從 `develop` 分出 `feature/<功能名>`
2. **更新 Kanban** — 任務移至 `In Progress`
3. **TDD 開發** — 先寫測試（RED）→ 實作（GREEN）→ 重構（IMPROVE）
4. **小步提交** — 頻繁 commit，每個 commit 聚焦單一變更
5. **Code Review** — 更新 Kanban 至 `Code Review`，使用 code-reviewer agent 審查
6. **合併** — Review 通過後合併回 `develop`，更新 Kanban 至 `Complete`

### 品質要求
- 開發可以慢，但每一步要扎實
- Rust 核心邏輯測試覆蓋率 90%+
- 前端元件測試覆蓋率 80%+
- 每個 PR 都必須經過 code review
- 不允許跳過測試直接合併

## 程式碼規範

### 檔案結構
- 遵循企業級標準，每個檔案/資料夾的職責歸屬必須清晰
- 一個模組只做一件事，命名要能反映其責任
- 避免「雜物抽屜」式的 `utils.ts` 或 `helpers.rs` — 若需工具函式，按領域拆分（如 `format.ts`、`platform.rs`）
- 新增檔案前先確認是否有既有檔案已涵蓋該職責

### 註解規範
- **所有註解統一使用英文**
- 只在邏輯不明顯時才加註解 — 好的命名勝過多餘的註解
- 禁止殘留無用註解（尤其是刪除程式碼片段時，不要留下被註解掉的舊程式碼）
- 禁止 `// TODO` 無期限殘留 — 若有待辦事項，寫入 Obsidian Kanban Board
- 禁止「說明顯而易見的事」的註解（如 `// increment counter` 在 `counter += 1` 旁邊）

### 企業級審查標準
- 撰寫程式碼時以企業級標準自我審視 — 假設這段程式碼會被資深工程師 review
- 程式碼要精簡，不寫冗餘邏輯，避免過度抽象

### 資安監測
- 每次 code review 必須檢查資料外洩風險（API key、token、密碼、個人資料）
- 檔案操作（刪除、重命名）必須做路徑驗證，防止 path traversal
- 使用者輸入必須在系統邊界做 sanitization
- 掃描結果中若包含敏感路徑，不得外傳或記錄到日誌

### 官方文件優先
- 撰寫程式碼前**必須先查閱官方文件**（使用 Context7 MCP 工具）確認 API 用法
- 避免依賴訓練資料中的過時語法 — packages 會更新，你的知識可能已過時
- 遇到不確定的 API 用法，先查文件再寫，不要猜測

## 技術棧
- 桌面框架：Tauri v2（Rust 後端）
- 前端框架：React 19 + TypeScript
- UI 元件：shadcn/ui + Tailwind CSS v4
- 表格：TanStack Table
- 圖表：Recharts
- 狀態管理：TanStack Query + Zustand
- 持久化：SQLite（rusqlite）
- 多語言：react-i18next
- 建置工具：Vite + pnpm

## 支援的環境類型
- Python：venv、virtualenv、conda、uv、poetry、pipenv、pyenv
- Node.js：node_modules
