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
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# ISIN 管理系統

一個整合 NestJS 後端與 Vue.js 前端的現代化企業管理平台。

## 🏗️ 專案架構

### 後端 (NestJS)
- **框架**: NestJS 11 + TypeScript
- **資料庫**: MySQL + TypeORM
- **認證**: JWT + Passport
- **API 文件**: Swagger/OpenAPI
- **排程**: @nestjs/schedule

### 前端 (Vue.js)
- **框架**: Vue.js 3 + TypeScript
- **建置工具**: Vite
- **路由**: Vue Router 4
- **狀態管理**: Pinia
- **樣式**: CSS3 + 響應式設計

## 🚀 快速開始

### 前置需求
- Node.js >= 18
- MySQL 8.0+
- npm 或 yarn

### 1. 安裝依賴

```bash
# 安裝後端依賴
npm install

# 安裝前端依賴
cd frontend && npm install
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
PORT=3001
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

# 前端開發模式
npm run frontend:dev
```

#### 生產模式
```bash
# 建置後端
npm run build

# 建置前端
npm run frontend:build

# 啟動後端
npm run start:prod
```

## 📁 專案結構

```
isin_nest/
├── src/                    # 後端 NestJS 原始碼
│   ├── auth/              # 認證模組
│   ├── hr/                # 人力資源模組
│   │   ├── staff/         # 員工管理
│   │   ├── attend-record/ # 出勤記錄
│   │   ├── staff-leave/   # 請假管理
│   │   ├── staff-manhour/ # 工時管理
│   │   ├── staff-segment/ # 部門管理
│   │   └── working-hours/ # 工時統計
│   ├── scheduler/         # 排程任務
│   └── app.module.ts      # 主要模組
├── frontend/              # 前端 Vue.js 應用
│   ├── src/
│   │   ├── views/         # 頁面組件
│   │   ├── router/        # 路由配置
│   │   └── App.vue        # 主要組件
│   ├── index.html         # HTML 模板
│   └── vite.config.ts     # Vite 配置
├── test/                  # 測試檔案
└── package.json           # 專案配置
```

## 🔧 開發指南

### 後端開發

```bash
# 程式碼格式化
npm run format

# 程式碼檢查
npm run lint

# 執行測試
npm run test

# 執行 E2E 測試
npm run test:e2e
```

### 前端開發

```bash
cd frontend

# 開發模式
npm run dev

# 建置
npm run build

# 類型檢查
npm run type-check
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

## 📊 資料庫設計

### 主要實體
- **User**: 用戶帳號資訊
- **Staff**: 員工基本資料
- **AttendRecord**: 出勤記錄
- **StaffManhour**: 工時記錄
- **StaffLeave**: 請假記錄
- **StaffSegment**: 部門資訊

## 🚀 部署

### Docker 部署

```bash
# 建置映像
docker build -t isin-nest .

# 運行容器
docker run -p 3001:3001 isin-nest
```

### 傳統部署

1. 建置後端：`npm run build`
2. 建置前端：`npm run frontend:build`
3. 部署 `dist/` 和 `frontend/dist/` 目錄
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

## 📝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 發起 Pull Request

## 📄 授權

本專案採用 ISC 授權條款。

## 🤝 支援

如有問題或建議，請：
1. 查看 [Issues](../../issues)
2. 創建新的 Issue
3. 聯繫開發團隊

---

**ISIN 管理系統** - 讓企業管理更簡單、更高效！
