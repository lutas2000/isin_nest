<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/badge/Follow%20us-Twitter-1DA1F2.svg" alt="Follow us on Twitter"></a>
</p>

# ISIN 管理系統

一個整合 NestJS 後端與 Vue.js 前端的現代化企業管理平台，使用 **Nx Monorepo** 架構進行管理。

## 🏗️ 專案架構

### 技術棧

- **Monorepo 管理**: Nx 21.4.1
- **後端框架**: NestJS 11 + TypeScript
- **前端框架**: Vue.js 3 + TypeScript
- **資料庫**: MySQL + TypeORM
- **認證**: JWT + Passport
- **API 文件**: Swagger/OpenAPI
- **排程**: @nestjs/schedule

### 應用結構

- **backend**: NestJS 後端 API 服務
- **frontend**: Vue.js 前端應用

## 📁 專案結構

```
isin_nest/
├── apps/                    # 應用目錄
│   ├── backend/            # NestJS 後端應用
│   │   ├── src/           # 後端源碼
│   │   │   ├── auth/      # 認證模組
│   │   │   ├── hr/        # 人力資源模組
│   │   │   │   ├── staff/         # 員工管理
│   │   │   │   ├── attend-record/ # 出勤記錄
│   │   │   │   ├── staff-leave/   # 請假管理
│   │   │   │   ├── staff-manhour/ # 工時管理
│   │   │   │   ├── staff-segment/ # 部門管理
│   │   │   │   └── working-hours/ # 工時統計
│   │   │   ├── scheduler/ # 排程任務
│   │   │   └── app.module.ts
│   │   ├── test/          # 後端測試
│   │   ├── project.json   # Nx 專案配置
│   │   └── webpack.config.js
│   └── frontend/          # Vue.js 前端應用
│       ├── src/
│       │   ├── views/     # 頁面組件
│       │   ├── router/    # 路由配置
│       │   └── App.vue    # 主要組件
│       ├── index.html     # HTML 模板
│       ├── project.json   # Nx 專案配置
│       └── webpack.config.js
├── nx.json                 # Nx 工作區配置
├── package.json            # 根依賴管理
├── jest.preset.js          # Jest 測試配置
├── .eslintrc.json          # ESLint 配置
└── dev-scripts.js          # 開發腳本
```

## 🚀 快速開始

### 前置需求

- Node.js >= 18
- MySQL 8.0+
- npm 或 yarn

### 1. 安裝依賴

```bash
# 安裝所有依賴（包括 Nx 相關）
npm install

# 安裝 Nx CLI (可選)
npm install -g nx
```

### 2. 環境配置

創建 `.env` 檔案：

```env
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=isin_db

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# 應用配置
PORT=3000
```

### 3. 啟動應用

#### 開發模式（同時運行前後端）

```bash
npm run dev:full
```

#### 分別啟動

```bash
# 後端開發模式
npm run start:dev
# 或
npx nx serve backend

# 前端開發模式
npm run frontend:dev
# 或
npx nx serve frontend
```

#### 生產模式

```bash
# 建置所有專案
npm run build

# 建置特定專案
npm run build:backend
npm run build:frontend

# 啟動後端
npm run start:prod
```

## 🔧 開發指南

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

# 測試覆蓋率
npm run test:cov

# E2E 測試
npm run test:e2e
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

## ⚙️ 專案配置

### Backend 配置

- **構建工具**: Webpack (Node.js 目標)
- **測試框架**: Jest
- **TypeScript**: 嚴格模式已關閉以相容現有程式碼
- **開發服務**: 使用 NestJS CLI watch 模式

### Frontend 配置

- **構建工具**: Webpack (Vue.js 支援)
- **測試框架**: Vite Test
- **TypeScript**: 支援 Vue 單檔案組件
- **開發服務**: 使用 Vite 開發服務器

## 🚀 開發工作流程

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

## 🌐 API 端點

### 認證

- `POST /auth/login` - 用戶登入
- `POST /auth/register` - 用戶註冊
- `POST /auth/refresh` - 重新整理 Token

### 人力資源

- `GET /hr/staff` - 取得員工列表
- `POST /hr/staff` - 新增員工
- `GET /hr/attendance` - 取得出勤記錄
- `POST /hr/attendance` - 新增出勤記錄
- `GET /hr/manhour` - 取得工時記錄
- `POST /hr/manhour` - 新增工時記錄

## 🔐 認證與授權

系統使用 JWT (JSON Web Token) 進行身份驗證：

1. 用戶登入後獲得 Access Token
2. 請求 API 時在 Header 中攜帶 Token
3. Token 過期後使用 Refresh Token 更新

### 前端登入系統

前端已實現完整的登入檢查功能：

- **自動登入檢查**：進入前端時自動檢查用戶登入狀態
- **強制跳轉**：未登入用戶自動跳轉到登入頁面
- **路由保護**：所有業務頁面都需要登入才能訪問
- **狀態管理**：使用 Pinia 管理認證狀態
- **持久化存儲**：登入狀態保存在 localStorage 中

**使用方法：**

- 首次訪問：系統自動檢查登入狀態，未登入則跳轉到登入頁面
- 登入：使用您的帳號密碼登入系統
- 登出：點擊側邊欄底部的「登出」按鈕或頂部導航欄的用戶頭像

**安全特性：**

- 所有業務路由都標記了 `requiresAuth: true`
- 路由守衛會檢查每個頁面的訪問權限
- 自動驗證用戶數據的有效性
- 登出時清除所有認證信息

## 📊 資料庫設計

### 主要實體

- **User**: 用戶帳號資訊
- **Staff**: 員工基本資料
- **AttendRecord**: 出勤記錄
- **StaffManhour**: 工時記錄
- **StaffLeave**: 請假記錄
- **StaffSegment**: 部門資訊

## 🚀 部署

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

### Docker 部署

```bash
# 建置映像
docker build -t isin-nest .

# 運行容器
docker run -p 3000:3000 isin-nest
```

### 傳統部署

1. 建置後端：`npm run build:backend`
2. 建置前端：`npm run build:frontend`
3. 部署 `dist/apps/backend/` 和 `dist/apps/frontend/` 目錄
4. 配置反向代理（Nginx/Apache）

## 🧪 測試

```bash
# 單元測試
npm run test

# 測試覆蓋率
npm run test:cov

# E2E 測試
npm run test:e2e
```

## 🔧 故障排除

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

4. **資料庫連接錯誤**
   - 確保 MySQL 服務正在運行
   - 檢查 `.env` 檔案中的資料庫配置
   - TypeORM 會自動重試連接，這是正常行為

### 重置專案

```bash
# 清除所有構建輸出和快取
npx nx reset
rm -rf dist/
npm install
```

## 📚 更多資訊

- [Nx 官方文檔](https://nx.dev/)
- [NestJS 文檔](https://nestjs.com/)
- [Vue.js 文檔](https://vuejs.org/)
- [Webpack 文檔](https://webpack.js.org/)
