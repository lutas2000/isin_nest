# 前端規則：Design System

## 目的

確保 UI 元件的視覺語言一致，避免同義樣式在不同頁面重複發明。

## 規則

- 優先沿用既有設計語彙（色彩、字級、間距、圓角、陰影）
- 新增樣式 token 前，先檢查是否已有可重用選項
- 同類型元件（按鈕、表單、標籤）應保持狀態行為一致
- 若需引入新視覺模式，先在可重用元件層落地，再進入頁面

## 舊版銷管（`/legacy-crm`）

舊版銷管畫面要與舊 VB6 系統逐欄相同，視覺語言與新版分開（`docs/LEGACY-CRM-FRONTEND.md`「樣式」）：

- 舊版元件只用 `apps/frontend/src/legacy-crm/styles/` 的 `.legacy-*` class 與 `--lg-*` token，不用 Tailwind class 或 `@theme` token。
- 新版頁面不可使用 `--lg-*` 或 `.legacy-*`；不在 Tailwind `@theme` 加舊版色票。
- 所有舊版樣式限定在 `.legacy-root` 內。全域選擇器（`@page`、`@media print`、`body`、元素選擇器）不可影響新版頁面。
- `--lg-*` 的值來自舊版畫面比對，不可為了「統一風格」修改；改了要重跑 `scripts/legacy-crm/compare-screens.mjs`。

## 按需加載條件

- 任務涉及 UI/UX 調整、視覺重構、共用樣式整理時
