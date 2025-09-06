# ISIN 管理系統前端

這是 ISIN 管理系統的前端應用，使用 Vue.js 3 + TypeScript + Vite 建構。

## 技術架構

- **前端框架**: Vue.js 3 (Composition API)
- **開發語言**: TypeScript
- **建置工具**: Vite
- **路由管理**: Vue Router 4
- **狀態管理**: Pinia
- **樣式**: CSS3 + 響應式設計

## 專案結構

```
frontend/
├── src/
│   ├── views/          # 頁面組件
│   │   ├── Home.vue    # 首頁
│   │   ├── HR.vue      # 人力資源管理
│   │   └── Auth.vue    # 認證管理
│   ├── router/         # 路由配置
│   │   └── index.ts
│   ├── App.vue         # 主要應用組件
│   ├── main.ts         # 應用入口點
│   └── style.css       # 全域樣式
├── index.html          # HTML 模板
├── vite.config.ts      # Vite 配置
├── tsconfig.json       # TypeScript 配置
└── package.json        # 專案依賴
```

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

前端應用將在 `http://localhost:3000` 啟動。

### 建置生產版本

```bash
npm run build
```

建置後的檔案將輸出到 `dist/` 目錄。

### 預覽建置結果

```bash
npm run preview
```

### 類型檢查

```bash
npm run type-check
```

## 功能特色

### 🏠 首頁
- 系統概覽和功能介紹
- 技術架構說明
- 響應式設計

### 👥 人力資源管理
- 員工管理
- 出勤記錄
- 工時管理
- 請假系統
- 部門管理
- 工時統計

### 🔐 認證與授權
- 用戶登入/註冊
- JWT 認證
- 角色權限管理
- 密碼重設

## 開發指南

### 新增頁面

1. 在 `src/views/` 目錄下創建新的 `.vue` 檔案
2. 在 `src/router/index.ts` 中添加路由配置
3. 在導航選單中添加連結

### 組件開發

- 使用 Composition API 和 `<script setup>` 語法
- 遵循 Vue 3 最佳實踐
- 使用 TypeScript 進行類型安全開發

### 樣式開發

- 使用 CSS3 和 Flexbox/Grid 佈局
- 支援響應式設計
- 遵循 BEM 命名規範

## 與後端整合

前端應用配置了 API 代理，將 `/api/*` 請求轉發到後端 NestJS 服務器（預設 `http://localhost:3001`）。

## 部署

### 靜態檔案部署

建置後的 `dist/` 目錄可以部署到任何靜態檔案伺服器：

- Nginx
- Apache
- CDN 服務
- 雲端儲存服務

### Docker 部署

可以創建 Docker 映像來部署前端應用。

## 瀏覽器支援

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88
