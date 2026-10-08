import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * 舊版銷管 /legacy-crm 的端對端測試（LEGACY-CRM-REBUILD-PLAN.md 第 3、4 階段）：登入導向、
 * `crm` 權限、唯讀模式、主檔新增／修改／更改編號／刪除，以及單據、報表與列印紀錄。測試資料的
 * 編號都以 ZZE2E 開頭，結束時刪除。會寫入資料，只能對可拋棄的測試資料庫執行：
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

async function openForm(page: Page, item: string, menu = '檔案(F)') {
  await page.getByRole('button', { name: menu }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

/** 以 API 呼叫舊版銷管（/api/legacy-crm），用於準備與清除測試資料。 */
async function legacyApi(
  userName: string,
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<Response> {
  const login = (await (
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userName, password: PASSWORD }),
    })
  ).json()) as { access_token: string };
  return fetch(`${BASE_URL}/api/legacy-crm${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${login.access_token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** 單據表頭的欄位（`.legacy-form-field`，依標籤找）。 */
const formField = (page: Page, label: string) =>
  page
    .locator('.legacy-form-field')
    .filter({ hasText: label })
    .locator('input')
    .first();
/** 單據明細第 row 列（從 1 起算）的欄位，依 aria-label 的欄名找。 */
const lineField = (page: Page, row: number, column: string) =>
  page.getByLabel(`第 ${row} 列${column}`, { exact: true });

const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const field = (page: Page, label: string) =>
  page
    .locator('.legacy-master-field')
    .filter({ hasText: label })
    .locator('input')
    .first();
const message = (page: Page) => page.locator('.legacy-form-message');
// The legacy Windows message boxes (legacyMessage.ts).
const messageBox = (page: Page, title: string) =>
  page.getByRole('alertdialog', { name: title });

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

test('選單：員工建檔不在檔案選單，交易登錄與報表已搬入', async ({
  browser,
}) => {
  const page = await signedIn(browser, USERS.admin);
  await page.goto('/legacy-crm');
  await page.getByRole('button', { name: '檔案(F)' }).click();
  await expect(page.getByRole('menuitem', { name: '員工建檔' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openForm(page, '訂單登錄', '交易登錄(T)');
  await expect(formField(page, '訂單編號')).toBeVisible();
  await expect(page.getByText('尚未搬入新系統')).toHaveCount(0);
  await openForm(page, '銷貨報表', '報表列印(R)');
  await expect(page.getByRole('form', { name: '銷貨報表列印' })).toBeVisible();
  await page.context().close();
});

test('唯讀：單據可瀏覽、F11／F12、列印預覽，不能新增或改明細', async ({
  browser,
}) => {
  const page = await signedIn(browser, USERS.read);
  await page.goto('/legacy-crm');
  await openForm(page, '訂單登錄', '交易登錄(T)');
  await button(page, '尾筆 M').click();
  await expect(formField(page, '訂單編號')).not.toHaveValue('');
  for (const name of ['新增 F5', '更新 F6', '刪除 F7'])
    await expect(button(page, name)).toBeDisabled();
  for (const name of ['查詢 R', '頭筆 I', '列印 P', '列印標籤(L)'])
    await expect(button(page, name)).toBeEnabled();
  await expect(formField(page, '訂單日期')).toHaveAttribute('readonly', '');

  // 明細可以聚焦但不能改；F3／F4 不動作，F11 秀圖、F12 交易歷史照常。
  const drawing = lineField(page, 1, '電腦圖號');
  const drawingNo = await drawing.inputValue();
  expect(drawingNo).not.toBe('');
  await expect(drawing).toHaveAttribute('readonly', '');
  await drawing.focus();
  await page.keyboard.type('X');
  await page.keyboard.press('F4');
  await expect(drawing).toHaveValue(drawingNo);
  await page.keyboard.press('F11');
  await expect(page.getByRole('dialog', { name: '圖型顯示' })).toBeVisible();
  await page
    .getByRole('dialog', { name: '圖型顯示' })
    .getByRole('button', { name: '關　閉' })
    .click();
  await drawing.focus();
  await page.keyboard.press('F12');
  await expect(
    page.getByRole('dialog', { name: `${drawingNo}出貨記錄` }),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: `${drawingNo}出貨記錄` })
    .getByRole('button', { name: '確定' })
    .click();

  // 列印 P：預覽並記錄 document_preview（唯讀也可以列印）。
  const logged = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/legacy-crm/print-log') &&
      response.request().method() === 'POST',
  );
  await button(page, '列印 P').click();
  const preview = page.getByRole('dialog', { name: '訂貨單預覽' });
  await expect(preview).toBeVisible();
  const response = await logged;
  expect(response.status()).toBe(204);
  expect(response.request().postDataJSON()).toMatchObject({
    kind: 'document_preview',
    target: '訂貨單',
    page_count: 1,
  });
  await expect(preview.getByRole('button', { name: '印出 O' })).toBeEnabled();
  await page.keyboard.press('c');
  await expect(preview).toHaveCount(0);

  // 其他單據：可瀏覽，不能新增。
  for (const [menu, item] of [
    ['交易登錄(T)', '銷貨登錄'],
    ['交易登錄(T)', '收款登錄'],
    ['交易登錄(T)', '報價登錄'],
    ['交易登錄(T)', '工作登錄'],
    ['檔案(F)', '圖組建檔'],
  ]) {
    await openForm(page, item, menu);
    await button(page, '頭筆 I').click();
    await expect(
      page.locator('.legacy-child.active .legacy-form-field input').first(),
    ).not.toHaveValue('');
    await expect(button(page, '新增 F5')).toBeDisabled();
    await expect(button(page, '更新 F6')).toBeDisabled();
  }
  // 工作登錄的 F5 不開「訂單轉成工作單」。
  await openForm(page, '工作登錄', '交易登錄(T)');
  await page.keyboard.press('F5');
  await expect(
    page.getByRole('dialog', { name: '訂單轉成工作單' }),
  ).toHaveCount(0);

  // 報表：唯讀可以預覽。
  await openForm(page, '訂單報表', '報表列印(R)');
  await page.getByRole('button', { name: '確　定' }).click();
  await expect(
    page.getByRole('dialog', { name: '未交貨工件明細表預覽' }),
  ).toBeVisible();
  await page.context().close();
});

test('寫入：訂單新增（自動開列印預覽）、修改、刪除', async ({ browser }) => {
  const customer = 'ZZE2E3';
  const orderNo = 'ZZE2E01';
  const created = await legacyApi(USERS.write, '/partners', 'POST', {
    kind: 'customer',
    code: customer,
    full_name: '端對端訂單客戶',
    short_name: '端對端訂',
    phone1: '04-0000000',
  });
  expect(created.status).toBe(201);
  const page = await signedIn(browser, USERS.write);
  try {
    await page.goto('/legacy-crm');
    await openForm(page, '訂單登錄', '交易登錄(T)');
    await button(page, '新增 F5').click();
    // 新增時依訂單日期帶出新單號；這裡改成測試用的單號。
    await expect(formField(page, '訂單編號')).not.toHaveValue('');
    await formField(page, '訂單編號').fill(orderNo);
    await page.getByLabel('客戶編號', { exact: true }).fill(customer);
    await page.getByLabel('客戶名稱', { exact: true }).fill('端對端訂單客戶');
    await lineField(page, 1, '電腦圖號').fill('ZZE2EP1');
    await lineField(page, 1, '客戶型號').fill('E2E-MODEL');
    await lineField(page, 1, '數量').fill('3');
    await lineField(page, 1, '單位').fill('片');
    await button(page, '存檔 F6').click();

    // 新增存檔後立刻開列印預覽，關閉後回到新增。
    const preview = page.getByRole('dialog', { name: '訂貨單預覽' });
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(orderNo);
    await page.keyboard.press('c');
    await expect(button(page, '取消 F5')).toBeVisible();
    await button(page, '取消 F5').click();

    await formField(page, '訂單編號').fill(orderNo);
    await formField(page, '訂單編號').press('Enter');
    await expect(lineField(page, 1, '電腦圖號')).toHaveValue('ZZE2EP1');
    await expect(lineField(page, 1, '數量')).toHaveValue('3');
    await lineField(page, 1, '數量').fill('5');
    await button(page, '更新 F6').click();
    await expect(message(page)).toHaveText('存檔完成');
    const saved = (await (
      await legacyApi(USERS.write, `/orders/${orderNo}`)
    ).json()) as { item: { items: { quantity: number }[] } };
    expect(saved.item.items[0].quantity).toBe(5);

    await button(page, '刪除 F7').click();
    await expect(message(page)).toHaveText('已刪除');
    expect((await legacyApi(USERS.write, `/orders/${orderNo}`)).status).toBe(
      404,
    );
  } finally {
    await legacyApi(USERS.write, `/orders/${orderNo}`, 'DELETE');
    await legacyApi(USERS.write, `/partners/customer/${customer}`, 'DELETE');
    await page.context().close();
  }
});

test('寫入：客戶新增、重複、修改、更改編號、刪除', async ({ browser }) => {
  const page = await signedIn(browser, USERS.write);
  const stored = async (code: string) =>
    (await legacyApi(USERS.write, `/partners/customer/${code}`)).status;
  try {
    await page.goto('/legacy-crm');
    await openForm(page, '客戶建檔');
    await button(page, '新增 F5').click();
    await field(page, '客戶編號').fill('ZZE2E1');
    await field(page, '客戶全名').fill('端對端測試客戶');
    await field(page, '客戶簡稱').click();
    await expect(field(page, '客戶簡稱')).toHaveValue('端對端測');
    await field(page, '電 話 一').fill('04-0000000');
    await page.keyboard.press('F6');
    await expect(button(page, '新增 F5')).toBeVisible();
    await expect.poll(() => stored('ZZE2E1')).toBe(200);

    await button(page, '新增 F5').click();
    await field(page, '客戶編號').fill('ZZE2E1');
    await field(page, '客戶全名').fill('重複');
    await field(page, '客戶簡稱').fill('重複');
    await field(page, '電 話 一').fill('1');
    await button(page, '存檔 F6').click();
    await expect(messageBox(page, '資料新增')).toContainText('資料重覆。');
    await page.keyboard.press('Enter');
    await expect(messageBox(page, '資料新增')).toHaveCount(0);
    await button(page, '取消 F5').click();

    await field(page, '客戶編號').fill('ZZE2E1');
    await field(page, '客戶編號').press('Enter');
    await expect(field(page, '客戶全名')).toHaveValue('端對端測試客戶');
    // Enter on the key moves to the next field with its text selected.
    await expect(field(page, '客戶全名')).toBeFocused();
    await field(page, '備　　註').fill('更新過');
    await button(page, '更新 F6').click();
    await expect(messageBox(page, '資料修改')).toContainText(
      '確定修改這筆資料？',
    );
    await page.keyboard.press('y');
    await expect
      .poll(
        async () =>
          (
            await (
              await legacyApi(USERS.write, '/partners/customer/ZZE2E1')
            ).json()
          ).item?.notes,
      )
      .toBe('更新過');

    await button(page, '更改編號').click();
    await page.getByLabel('請輸入新的編號：').fill('ZZE2E2');
    await page.getByRole('button', { name: '確　定' }).click();
    await expect(field(page, '客戶編號')).toHaveValue('ZZE2E2');
    await expect(field(page, '備　　註')).toHaveValue('更新過');

    await button(page, '刪除 F7').click();
    await messageBox(page, '資料刪除')
      .getByRole('button', { name: '是(Y)' })
      .click();
    await expect.poll(() => stored('ZZE2E2')).toBe(404);
    await expect(field(page, '客戶編號')).not.toHaveValue('ZZE2E2');
  } finally {
    await legacyApi(USERS.write, '/partners/customer/ZZE2E1', 'DELETE');
    await legacyApi(USERS.write, '/partners/customer/ZZE2E2', 'DELETE');
    await page.context().close();
  }
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
