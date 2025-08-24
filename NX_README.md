# ISIN Nest 專案 - Nx Monorepo 管理

## 專案概述

這個專案使用 Nx 作為 monorepo 管理工具，包含以下應用：

- **backend**: NestJS 後端 API 服務
- **frontend**: Vue.js 前端應用

## 專案結構

```
isin_nest/
├── apps/
│   ├── backend/          # NestJS 後端應用
│   │   ├── src/         # 後端源碼
│   │   ├── test/        # 後端測試
│   │   ├── project.json # Nx 專案配置
│   │   └── webpack.config.js
│   └── frontend/        # Vue.js 前端應用
│       ├── src/         # 前端源碼
│       ├── project.json # Nx 專案配置
│       └── webpack.config.js
├── nx.json              # Nx 工作區配置
├── package.json         # 根依賴管理
└── jest.preset.js       # Jest 測試配置
```

## 安裝和設置

### 1. 安裝依賴

```bash
npm install
```

### 2. 安裝 Nx CLI (可選)

```bash
npm install -g nx
```

## 常用命令

### 構建專案

```bash
# 構建所有專案
npm run build

# 構建特定專案
npm run build:backend
npm run build:frontend

# 使用 Nx 命令
npx nx build backend
npx nx build frontend
```

### 開發模式

```bash
# 啟動後端開發服務
npm run start:dev
# 或
npx nx serve backend

# 啟動前端開發服務
npm run frontend:dev
# 或
npx nx serve frontend

# 同時啟動前後端
npm run dev:full
```

### 測試

```bash
# 測試所有專案
npm run test

# 測試特定專案
npm run test:backend
npm run test:frontend

# 使用 Nx 命令
npx nx test backend
npx nx test frontend
```

### 程式碼品質

```bash
# 檢查所有專案
npm run lint

# 檢查特定專案
npm run lint:backend
npm run lint:frontend

# 格式化程式碼
npm run format
```

### Nx 專用命令

```bash
# 顯示專案圖
npx nx graph

# 顯示受影響的專案
npx nx affected:graph

# 顯示專案資訊
npx nx show project backend
npx nx show project frontend
```

## 專案配置

### Backend 配置

- **構建工具**: Webpack
- **測試框架**: Jest
- **TypeScript**: 嚴格模式已關閉以相容現有程式碼

### Frontend 配置

- **構建工具**: Webpack (Vue.js 支援)
- **測試框架**: Vite Test
- **TypeScript**: 支援 Vue 單檔案組件

## 開發工作流程

### 1. 新增功能

```bash
# 在後端新增模組
npx nx generate @nx/js:library --name=my-module --directory=apps/backend/src

# 在前端新增組件
npx nx generate @nx/vue:component --name=MyComponent --project=frontend
```

### 2. 執行影響分析

```bash
# 查看受影響的專案
npx nx affected:graph

# 只構建受影響的專案
npx nx affected:build
```

### 3. 快取管理

Nx 會自動快取構建結果，提升開發效率：

```bash
# 清除快取
npx nx reset

# 查看快取狀態
npx nx show project backend --verbose
```

## 部署

### 生產構建

```bash
# 構建所有專案用於生產
npm run build

# 構建特定專案
npm run build:backend
npm run build:frontend
```

構建輸出位於：

- 後端: `dist/apps/backend/`
- 前端: `dist/apps/frontend/`

## 故障排除

### 常見問題

1. **TypeScript 編譯錯誤**

   - 檢查 `tsconfig.json` 配置
   - 確保所有依賴已安裝

2. **Webpack 構建失敗**

   - 檢查 loader 配置
   - 確保所有必要的 loader 已安裝

3. **Nx 命令無法執行**
   - 確保 Nx 已正確安裝
   - 檢查 `nx.json` 配置

### 重置專案

```bash
# 清除所有構建輸出和快取
npx nx reset
rm -rf dist/
npm install
```

## 更多資訊

- [Nx 官方文檔](https://nx.dev/)
- [NestJS 文檔](https://nestjs.com/)
- [Vue.js 文檔](https://vuejs.org/)
- [Webpack 文檔](https://webpack.js.org/)
