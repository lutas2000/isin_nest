import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * 舊版銷管 /legacy-crm 的端對端測試（LEGACY-CRM-REBUILD-PLAN.md 第 3 階段）：登入導向、`crm`
 * 權限、唯讀模式、主檔新增／修改／更改編號／刪除。會寫入資料，只能對可拋棄的測試資料庫執行：
 * 後端用 `apps/backend/src/legacy-crm/dev/serve-legacy-crm.ts`，前端 vite 代理到它。
 * 沒有設定下列環境變數時全部略過。
 *
 *   LEGACY_CRM_E2E_BASE_URL=http://127.0.0.1:3101   前端網址
 *   LEGACY_CRM_E2E_PASSWORD=…                       四個測試帳號共用的密碼
 *   LEGACY_CRM_E2E_ADMIN / _READ / _WRITE / _NONE    帳號（預設 lc_admin、lc_read、lc_write、lc_none）
 *                                                   admin；crm read；crm write；沒有 crm
 *   LEGACY_CRM_E2E_CHANNEL=chrome                   用本機 Chrome（沒有安裝 Playwright 瀏覽器時）
 *
 *   npx playwright test tests/legacy-crm --project=chromium --reporter=line
 */
const BASE_URL = process.env.LEGACY_CRM_E2E_BASE_URL ?? '';
const PASSWORD = process.env.LEGACY_CRM_E2E_PASSWORD ?? '';
const USERS = {
  admin: process.env.LEGACY_CRM_E2E_ADMIN ?? 'lc_admin',
  read: process.env.LEGACY_CRM_E2E_READ ?? 'lc_read',
  write: process.env.LEGACY_CRM_E2E_WRITE ?? 'lc_write',
  none: process.env.LEGACY_CRM_E2E_NONE ?? 'lc_none',
};

test.skip(
  !BASE_URL || !PASSWORD,
  '未設定 LEGACY_CRM_E2E_BASE_URL／LEGACY_CRM_E2E_PASSWORD',
);
test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 800 },
  ...(process.env.LEGACY_CRM_E2E_CHANNEL
    ? { channel: process.env.LEGACY_CRM_E2E_CHANNEL }
    : {}),
});
test.describe.configure({ mode: 'serial' });

/** 以 API 登入後把 token 放進 localStorage，開一個新的分頁。 */
async function signedIn(browser: Browser, userName: string): Promise<Page> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userName, password: PASSWORD }),
  });
  const login = (await response.json()) as {
    access_token: string;
    user: unknown;
  };
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(
    ([token, user]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', user);
      sessionStorage.setItem('seeded', '1');
    },
    [login.access_token, JSON.stringify(login.user)],
  );
  const page = await context.newPage();
  page.on('dialog', (dialog) => void dialog.accept());
  return page;
}

async function openForm(page: Page, item: string) {
  await page.getByRole('button', { name: '檔案(F)' }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const field = (page: Page, label: string) =>
  page
    .locator('.legacy-master-field')
    .filter({ hasText: label })
    .locator('input')
    .first();
const message = (page: Page) => page.locator('.legacy-form-message');

test('未登入時導向登入頁，登入後回到 /legacy-crm', async ({ page }) => {
  await page.goto('/legacy-crm');
  await page.waitForURL(/\/login\?redirect=(%2F|\/)legacy-crm/);
  await page.getByPlaceholder('請輸入用戶名').fill(USERS.write);
  await page.getByPlaceholder('請輸入密碼').fill(PASSWORD);
  await page.getByRole('button', { name: '登入' }).click();
  await page.waitForURL('**/legacy-crm');
  await expect(page.locator('.legacy-menubar')).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
});

test('沒有 crm 權限：導回首頁，首頁沒有入口', async ({ browser }) => {
  const page = await signedIn(browser, USERS.none);
  await page.goto('/legacy-crm');
  await page.waitForURL(BASE_URL + '/');
  await expect(page.getByRole('heading', { name: '舊版銷管系統' })).toHaveCount(
    0,
  );
  await page.context().close();
});

test('首頁入口開新分頁，唯讀使用者看到提示', async ({ browser }) => {
  const page = await signedIn(browser, USERS.read);
  await page.goto('/');
  const link = page.getByRole('link', { name: '開啟' });
  await expect(link).toHaveAttribute('href', '/legacy-crm');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(page.getByText('您的權限為唯讀')).toBeVisible();
  await page.context().close();
});

test('唯讀：新增、更新、刪除、更改編號停用，欄位不可改，仍可瀏覽與輸入編號查詢', async ({
  browser,
}) => {
  const page = await signedIn(browser, USERS.read);
  await page.goto('/legacy-crm');
  await expect(page.locator('.legacy-app-status-user')).toContainText('唯讀');
  await openForm(page, '客戶建檔');
  await button(page, '頭筆 I').click();
  await expect(field(page, '客戶編號')).not.toHaveValue('');
  for (const name of ['新增 F5', '更新 F6', '刪除 F7', '更改編號'])
    await expect(button(page, name)).toBeDisabled();
  for (const name of [
    '查詢 R',
    '上筆 J',
    '下筆 K',
    '頭筆 I',
    '尾筆 M',
    '關閉 C',
  ])
    await expect(button(page, name)).toBeEnabled();
  await expect(field(page, '客戶全名')).toBeDisabled();
  const first = await field(page, '客戶編號').inputValue();
  await button(page, '下筆 K').click();
  await expect(field(page, '客戶編號')).not.toHaveValue(first);
  await field(page, '客戶編號').fill(first);
  await field(page, '客戶編號').press('Enter');
  await expect(field(page, '客戶編號')).toHaveValue(first);
  await page.keyboard.press('F5');
  await expect(button(page, '新增 F5')).toBeVisible();
  await page.context().close();
});

test('選單：員工建檔不在檔案選單，尚未搬入的表單顯示說明', async ({
  browser,
}) => {
  const page = await signedIn(browser, USERS.admin);
  await page.goto('/legacy-crm');
  await page.getByRole('button', { name: '檔案(F)' }).click();
  await expect(page.getByRole('menuitem', { name: '員工建檔' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '交易登錄(T)' }).click();
  await page.getByRole('menuitem', { name: '訂單登錄' }).click();
  await expect(
    page.getByText('「訂單登錄」尚未搬入新系統，請暫時使用舊系統。'),
  ).toBeVisible();
  await page.context().close();
});

test('寫入：客戶新增、重複、修改、更改編號、刪除', async ({ browser }) => {
  const page = await signedIn(browser, USERS.write);
  await page.goto('/legacy-crm');
  await openForm(page, '客戶建檔');
  await button(page, '新增 F5').click();
  await field(page, '客戶編號').fill('ZZE2E1');
  await field(page, '客戶全名').fill('端對端測試客戶');
  await field(page, '客戶簡稱').click();
  await expect(field(page, '客戶簡稱')).toHaveValue('端對端測');
  await field(page, '電 話 一').fill('04-0000000');
  await page.keyboard.press('F6');
  await expect(message(page)).toHaveText('存檔完成');

  await button(page, '新增 F5').click();
  await field(page, '客戶編號').fill('ZZE2E1');
  await field(page, '客戶全名').fill('重複');
  await field(page, '客戶簡稱').fill('重複');
  await field(page, '電 話 一').fill('1');
  await button(page, '存檔 F6').click();
  await expect(message(page)).toHaveText('資料重覆。');
  await button(page, '取消 F5').click();

  await field(page, '客戶編號').fill('ZZE2E1');
  await field(page, '客戶編號').press('Enter');
  await expect(field(page, '客戶全名')).toHaveValue('端對端測試客戶');
  await field(page, '備　　註').fill('更新過');
  await button(page, '更新 F6').click();
  await expect(message(page)).toHaveText('存檔完成');

  await button(page, '更改編號').click();
  await page.getByLabel('請輸入新的編號：').fill('ZZE2E2');
  await page.getByRole('button', { name: '確　定' }).click();
  await expect(field(page, '客戶編號')).toHaveValue('ZZE2E2');
  await expect(field(page, '備　　註')).toHaveValue('更新過');

  await button(page, '刪除 F7').click();
  await expect(message(page)).toHaveText('已刪除');
  await expect(field(page, '客戶編號')).not.toHaveValue('ZZE2E2');
  await page.context().close();
});

test('token 失效時跳新系統的登出提示', async ({ browser }) => {
  const page = await signedIn(browser, USERS.admin);
  await page.goto('/legacy-crm');
  await page.evaluate(() => localStorage.setItem('auth_token', 'broken'));
  await openForm(page, '客戶建檔');
  await button(page, '頭筆 I').click();
  await expect(page.getByText('登出提示')).toBeVisible();
  await page.context().close();
});

test('狀態列的登出回到登入頁', async ({ browser }) => {
  const page = await signedIn(browser, USERS.admin);
  await page.goto('/legacy-crm');
  await page
    .locator('.legacy-app-status-user')
    .getByRole('button', { name: '登出' })
    .click();
  await page.waitForURL(/\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem('auth_token')),
  ).toBeNull();
  await page.context().close();
});
