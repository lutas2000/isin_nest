import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * 第 5 階段的端對端測試：舊版選單列「回報(B)」（含截圖預覽）、admin 的「紀錄查詢」，以及新系統
 * /settings/feedback 的權限與處理。會寫入資料，只能對可拋棄的測試資料庫執行（環境同 legacy-crm.spec.ts）。
 *
 *   LEGACY_CRM_E2E_BASE_URL=http://127.0.0.1:3201   前端網址
 *   LEGACY_CRM_E2E_PASSWORD=…                       測試帳號共用的密碼
 *   LEGACY_CRM_E2E_ADMIN / _READ                     admin；crm read（預設 lc_admin、lc_read）
 *   LEGACY_CRM_E2E_FEEDBACK                          有 feedback write、沒有 crm（預設 lc_feedback）
 *   LEGACY_CRM_E2E_CHANNEL=chrome
 *
 *   npx playwright test tests/legacy-crm/feedback.spec.ts --project=chromium --reporter=line
 *
 * 後端不要設定 FEEDBACK_SLACK_WEBHOOK_URL（不送 Slack）。
 */
const BASE_URL = process.env.LEGACY_CRM_E2E_BASE_URL ?? '';
const PASSWORD = process.env.LEGACY_CRM_E2E_PASSWORD ?? '';
const USERS = {
  admin: process.env.LEGACY_CRM_E2E_ADMIN ?? 'lc_admin',
  read: process.env.LEGACY_CRM_E2E_READ ?? 'lc_read',
  feedback: process.env.LEGACY_CRM_E2E_FEEDBACK ?? 'lc_feedback',
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

const title = `e2e 回報 ${Date.now()}`;

test('回報(B)：截圖預設不勾，勾選後先預覽再送出；非 admin 沒有紀錄查詢', async ({
  browser,
}) => {
  const page = await signedIn(browser, USERS.read);
  await page.goto('/legacy-crm');
  await expect(page.getByRole('button', { name: '紀錄查詢' })).toHaveCount(0);
  await page.getByRole('button', { name: '檔案(F)' }).click();
  await page.getByRole('menuitem', { name: '客戶建檔' }).click();

  // Alt+B 開啟、Esc 關閉
  await page.keyboard.press('Alt+KeyB');
  const dialog = page.getByRole('dialog', { name: '回報問題或需求' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  await page.getByRole('button', { name: '回報(B)' }).click();
  const attach = dialog.getByLabel('附上目前畫面截圖');
  await expect(attach).not.toBeChecked();
  await dialog.getByRole('button', { name: '送出(S)' }).click();
  await expect(dialog.locator('.legacy-feedback-message')).toHaveText(
    '請輸入標題。',
  );
  await dialog.getByLabel('需求').check();
  await dialog.getByLabel('標題').fill(title);
  await dialog.getByLabel('描述').fill('客戶建檔畫面希望可以匯出');
  await attach.check();
  const preview = dialog.getByRole('img', { name: '目前畫面截圖預覽' });
  await expect(preview).toBeVisible({ timeout: 15_000 });
  expect(
    await preview.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(1000);
  const sent = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/feedback') &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: '送出(S)' }).click();
  expect((await sent).status()).toBe(201);
  await expect(dialog.locator('.legacy-feedback-message')).toContainText(
    '回報已送出',
  );
  await dialog.getByRole('button', { name: '確定' }).click();
  await expect(dialog).toHaveCount(0);
  // 回報者自己進不了回報處理頁
  await page.goto('/settings/feedback');
  await page.waitForURL(BASE_URL + '/');
  await page.context().close();
});

test('feedback write：可處理回報，看不到截圖', async ({ browser }) => {
  const page = await signedIn(browser, USERS.feedback);
  await page.goto('/settings');
  // 非 admin 開系統設定頁本來就會跳「只有管理員…」（權限設定頁籤），先關掉。
  const ok = page.getByRole('button', { name: '確定' });
  await ok.waitFor({ timeout: 3000 }).then(
    () => ok.click(),
    () => undefined,
  );
  await page.getByRole('link', { name: '回報處理' }).first().click();
  await page.waitForURL('**/settings/feedback');
  await expect(page.getByRole('columnheader', { name: '截圖' })).toHaveCount(0);
  await page.getByRole('cell', { name: title }).click();
  const modal = page.locator('.fixed').filter({ hasText: title });
  await expect(modal.getByText('客戶建檔畫面希望可以匯出')).toBeVisible();
  await expect(modal.getByText('客戶資料')).toBeVisible(); // 目前視窗
  await expect(modal.getByText('截圖（只有管理員看得到）')).toHaveCount(0);
  await modal.getByLabel('狀態').selectOption('in_progress');
  await modal.getByLabel('處理者').selectOption({ label: 'lc_feedback' });
  await modal.getByLabel('處理結果').fill('排入下一版');
  await modal.getByRole('button', { name: '儲存' }).click();
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('處理中');
  await expect(row).toContainText('lc_feedback');
  await page.context().close();
});

test('admin：看得到截圖，紀錄查詢有兩個頁籤', async ({ browser }) => {
  const page = await signedIn(browser, USERS.admin);
  await page.goto('/settings/feedback');
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('有');
  await row.click();
  await page.getByRole('button', { name: '顯示截圖' }).click();
  const image = page.getByRole('img', { name: '回報截圖' });
  await expect(image).toBeVisible();
  expect(
    await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(1000);

  await page.goto('/legacy-crm');
  await page.getByRole('button', { name: '紀錄查詢' }).click();
  const window = page.getByRole('dialog', { name: '紀錄查詢' });
  await expect(window.getByRole('tab', { name: '寫入紀錄' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(window.locator('.legacy-log-footer')).toContainText('共');
  const firstRow = window.locator('tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.click();
    await expect(window.getByText('修改後')).toBeVisible();
  }
  await window.getByRole('tab', { name: '列印紀錄' }).click();
  await expect(
    window.getByRole('columnheader', { name: '種類' }),
  ).toBeVisible();
  // 查詢鈕在查詢中會停用、焦點掉到 body，Esc 仍要能關閉，F5 不可讓後面的畫面動作或重新整理。
  await window.getByRole('button', { name: '查詢' }).click();
  await expect(window.locator('.legacy-log-footer')).toContainText('共');
  await page.keyboard.press('F5');
  await expect(window).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(window).toHaveCount(0);

  // 回報對話框：勾選截圖後（擷取時勾選框暫時停用）Esc 仍能關閉
  await page.getByRole('button', { name: '回報(B)' }).click();
  const dialog = page.getByRole('dialog', { name: '回報問題或需求' });
  await dialog.getByLabel('附上目前畫面截圖').check();
  await expect(
    dialog.getByRole('img', { name: '目前畫面截圖預覽' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.context().close();
});
