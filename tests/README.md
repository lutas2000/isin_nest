# 前端 E2E 測試

本目錄包含使用 [Playwright](https://playwright.dev/) 撰寫的前端端到端（E2E）測試。

## 📁 目錄結構

```
tests/
├── README.md              # 本說明文件
├── helpers/               # 測試輔助工具
│   └── auth.ts           # 登入/登出輔助函數
└── crm/                   # CRM 模組測試
    ├── login.spec.ts     # 登入功能測試
    ├── customers.spec.ts # 客戶管理測試
    ├── contacts.spec.ts  # 聯絡人管理測試
    ├── quotes.spec.ts    # 報價單管理測試
    ├── orders.spec.ts    # 訂單管理測試
    └── navigation.spec.ts # 導航與端到端流程測試
```

## 🔧 環境設定

### 前置需求

- Node.js >= 18
- 已安裝專案依賴 (`npm install`)
- Playwright 瀏覽器已安裝

### 安裝 Playwright 瀏覽器

```bash
npx playwright install
```

### 環境配置

測試預設連接到 `http://localhost:3001`（前端開發伺服器）。

如需修改，請編輯 `playwright.config.ts` 中的 `baseURL` 設定。

## 🚀 執行測試

### 啟動應用程式

執行測試前，請確保前後端服務正在運行：

```bash
# 同時啟動前後端
npm run dev:full

# 或分別啟動
npm run start:dev      # 後端
npm run frontend:dev   # 前端
```

### 執行測試命令

```bash
# 執行所有測試
npx playwright test

# 執行特定測試檔案
npx playwright test tests/crm/login.spec.ts

# 執行特定測試目錄
npx playwright test tests/crm/

# 以 UI 模式執行（可視化介面）
npx playwright test --ui

# 以 headed 模式執行（顯示瀏覽器）
npx playwright test --headed

# 只執行特定瀏覽器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# 執行並產生報告
npx playwright test --reporter=html

# 查看測試報告
npx playwright show-report
```

### 偵錯測試

```bash
# 以偵錯模式執行
npx playwright test --debug

# 執行特定測試並偵錯
npx playwright test tests/crm/login.spec.ts --debug

# 產生追蹤檔案
npx playwright test --trace on
```

## 📋 測試涵蓋範圍

### 登入功能 (`login.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面顯示 | 驗證登入頁面正確顯示 |
| 表單驗證 | 必填欄位、按鈕狀態檢查 |
| 成功登入 | 使用正確帳號密碼登入 |
| 登入失敗 | 錯誤帳號密碼處理 |
| 重導向 | 已登入/未登入狀態的頁面重導向 |
| 鍵盤操作 | Enter 鍵提交表單 |

### 客戶管理 (`customers.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面元素 | 標題、按鈕、搜尋欄位顯示 |
| 新增客戶 | Modal 開啟、表單欄位、驗證 |
| 搜尋功能 | 關鍵字搜尋客戶 |
| 查看詳情 | 點擊客戶 ID 查看詳情 |
| 編輯客戶 | 編輯 Modal 功能 |
| 聯絡人導航 | 導航到客戶聯絡人頁面 |
| 分頁功能 | 分頁元件操作 |

### 聯絡人管理 (`contacts.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面顯示 | 聯絡人列表正確顯示 |
| 搜尋功能 | 搜尋聯絡人 |
| 客戶聯絡人 | 特定客戶的聯絡人頁面 |

### 報價單管理 (`quotes.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面元素 | 標題、描述、篩選器顯示 |
| 狀態篩選 | 待簽名/已簽名篩選 |
| 搜尋功能 | 搜尋報價單 |
| 編輯模式 | 雙擊/F2 進入編輯 |
| 轉訂單 | 已簽名報價單轉換功能 |
| 查看詳情 | 導航到報價單詳情頁 |

### 訂單管理 (`orders.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面元素 | 標題、描述、篩選器顯示 |
| 狀態篩選 | 進行中/已完成篩選 |
| 搜尋功能 | 搜尋訂單 |
| 新增功能 | 新增行顯示與填寫 |
| 編輯功能 | 編輯模式與取消 |
| 完成訂單 | 標記訂單為已完成 |
| 刪除功能 | 刪除確認對話框 |
| 鍵盤快捷鍵 | ↑↓ 移動、Enter 查看、F2 編輯、Delete 刪除、N 新增 |

### 導航與端到端 (`navigation.spec.ts`)

| 測試項目 | 說明 |
|---------|------|
| 頁面導航 | CRM 子頁面之間導航 |
| 瀏覽器操作 | 返回按鈕功能 |
| 登入狀態 | 導航時保持登入 |
| 頁面標題 | 正確顯示頁面標題 |
| 響應式設計 | 桌面/平板/手機視窗 |
| 錯誤處理 | 不存在頁面、無效 ID |
| 效能測試 | 頁面載入時間 |

## 🔑 測試帳號

測試使用以下預設帳號：

```typescript
{
  username: 'admin',
  password: 'a123456'
}
```

帳號設定位於 `tests/helpers/auth.ts`。

## 📝 撰寫新測試

### 基本範例

```typescript
import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('功能名稱', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/your-page');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示某個元素', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '標題' })).toBeVisible();
  });

  test('應該能夠執行某個操作', async ({ page }) => {
    await page.getByRole('button', { name: '按鈕' }).click();
    await expect(page).toHaveURL('/expected-url');
  });
});
```

### 最佳實踐

1. **使用輔助函數**：登入/登出使用 `helpers/auth.ts` 中的函數
2. **等待頁面載入**：使用 `waitForSelector` 或 `waitForLoadState`
3. **語意化選擇器**：優先使用 `getByRole`、`getByLabel`、`getByText`
4. **獨立測試**：每個測試應該獨立執行，不依賴其他測試的狀態
5. **清理狀態**：在 `afterEach` 中清理測試產生的資料

## 🔧 設定檔說明

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: './tests',           // 測試目錄
  fullyParallel: true,          // 平行執行測試
  retries: process.env.CI ? 2 : 0,  // CI 環境重試次數
  use: {
    baseURL: 'http://localhost:3001',  // 前端 URL
    trace: 'on-first-retry',           // 失敗時產生追蹤
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## 🚨 注意事項

1. **測試資料**：部分測試會建立測試資料，請確保測試環境可以接受資料變更
2. **平行執行**：測試預設平行執行，請確保測試之間不會互相干擾
3. **網路依賴**：測試需要後端 API 服務正常運行
4. **瀏覽器版本**：建議定期更新 Playwright 瀏覽器 (`npx playwright install`)

## 📚 參考資源

- [Playwright 官方文檔](https://playwright.dev/docs/intro)
- [Playwright 測試生成器](https://playwright.dev/docs/codegen)
- [Playwright 最佳實踐](https://playwright.dev/docs/best-practices)
