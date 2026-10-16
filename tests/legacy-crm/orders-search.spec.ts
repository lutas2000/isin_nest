import { test, expect, type Page } from '@playwright/test';

// 真實 OrdersView 的瀏覽器回歸測試，所有 API 都由固定資料回應。
// LEGACY_CRM_E2E_CHANNEL=chrome npx playwright test -c tests/legacy-crm/orders-search.config.ts
const customer = {
  code: 'C001',
  full_name: '查詢測試客戶',
  short_name: '查詢客戶',
};
const part = {
  drawing_no: 'D001',
  customer_model: 'MODEL-A',
  customer_code: customer.code,
  material: 'SUS',
  thickness: '2',
  unit: '片',
};
const order = {
  order_no: 'OLD001',
  customer_code: customer.code,
  customer_name: customer.full_name,
  items: [{ ...part, line_no: 1, quantity: '3' }],
};
const orderNumber = (page: Page) =>
  page
    .locator('.legacy-form-field')
    .filter({ hasText: '訂單編號' })
    .locator('input');
const drawing = (page: Page) =>
  page.getByLabel('第 1 列電腦圖號', { exact: true });
const model = (page: Page) =>
  page.getByLabel('第 1 列客戶型號', { exact: true });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.metadata.ordersSearchFixture,
    '請以 -c tests/legacy-crm/orders-search.config.ts 啟動獨立的測試頁面',
  );
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    expect(request.method(), '查詢流程不可寫入訂單').toBe('GET');
    let result: unknown;
    switch (url.pathname.replace('/api/legacy-crm', '')) {
      case '/partners':
      case '/assist/customer':
        result = { items: [customer] };
        break;
      case '/parts':
        result = { items: [part] };
        break;
      case '/assist/part':
        result = {
          items: part.drawing_no.startsWith(
            url.searchParams.get('prefix') || '',
          )
            ? [part]
            : [],
        };
        break;
      case '/assist/part-model':
        result = {
          items: part.customer_model.startsWith(
            url.searchParams.get('prefix') || '',
          )
            ? [part]
            : [],
        };
        break;
      case '/drawings/shapes':
        result = {
          shapes: { D001: { width: 10, height: 10, path: 'M0 0H10V10Z' } },
        };
        break;
      case '/documents/orders/query':
        result = {
          items: [{ number: order.order_no, party: order.customer_name }],
          truncated: false,
        };
        break;
      case '/orders/OLD001':
        result = { item: order };
        break;
      case '/documents/orders/next-number':
        result = { number: 'NEW001' };
        break;
      default:
        throw new Error(`未預期的 API：${request.url()}`);
    }
    await route.fulfill({ json: result });
  });
});

async function openOrders(page: Page, permission = 'write') {
  await page.goto(
    `/tests/fixtures/legacy-orders.html?permission=${permission}`,
  );
  await expect(
    page.getByRole('button', { name: '新增 F5', exact: true }),
  ).toBeVisible();
}

test('未新增：客戶首碼 F1 帶出代碼與名稱，可輸入名稱並查詢舊訂單', async ({
  page,
}) => {
  await openOrders(page);
  const code = page.getByLabel('客戶編號', { exact: true });
  await code.fill('C');
  const lookup = page.waitForRequest('**/assist/customer?prefix=C');
  await code.press('F1');
  await lookup;
  const customers = page.getByRole('dialog', { name: '客戶資料查詢' });
  await customers.getByRole('cell', { name: 'C001', exact: true }).dblclick();
  await expect(code).toHaveValue('C001');
  await expect(page.getByLabel('客戶名稱', { exact: true })).toHaveValue(
    customer.full_name,
  );
  await page.getByLabel('客戶名稱', { exact: true }).fill('自行輸入名稱');
  const query = page.waitForRequest('**/documents/orders/query?party=C001');
  await page.getByRole('button', { name: '查詢 R', exact: true }).click();
  await query;
  await page
    .getByRole('dialog', { name: '訂單登錄查詢' })
    .getByRole('cell', { name: 'OLD001', exact: true })
    .dblclick();
  await expect(orderNumber(page)).toHaveValue('OLD001');
  await expect(drawing(page)).toHaveValue('D001');
});

test('未新增：圖號首碼 F1 可預覽並帶入圖面，不產生訂單編號', async ({
  page,
}) => {
  await openOrders(page);
  await page.getByLabel('客戶編號', { exact: true }).fill('C001');
  await drawing(page).fill('D');
  const lookup = page.waitForRequest('**/assist/part?prefix=D&customer=C001');
  await drawing(page).press('F1');
  await lookup;
  const dialog = page.getByRole('dialog', { name: '工件資料查詢' });
  await expect(
    dialog.locator('.legacy-query-preview svg path'),
  ).toHaveAttribute('d', 'M0 0H10V10Z');
  await dialog.getByRole('cell', { name: 'D001', exact: true }).dblclick();
  await expect(drawing(page)).toHaveValue('D001');
  await expect(model(page)).toHaveValue('MODEL-A');
  await expect(orderNumber(page)).toHaveValue('');
  await page.getByRole('button', { name: '更新 F6', exact: true }).click();
  await expect(orderNumber(page)).toHaveValue('');
  await expect(
    page.getByRole('button', { name: '新增 F5', exact: true }),
  ).toBeVisible();
});

for (const state of ['blank', 'new', 'existing']) {
  test(`${state}：客戶型號首碼 F1 依型號查詢並帶入圖號、型號與圖面`, async ({
    page,
  }) => {
    await openOrders(page);
    if (state === 'new') {
      await page.getByRole('button', { name: '新增 F5', exact: true }).click();
      await expect(orderNumber(page)).toHaveValue('NEW001');
    } else if (state === 'existing') {
      await orderNumber(page).fill('OLD001');
      await orderNumber(page).press('Enter');
      await expect(drawing(page)).toHaveValue('D001');
    }
    await model(page).fill('MODEL');
    const lookup = page.waitForRequest('**/assist/part-model?prefix=MODEL*');
    await model(page).press('F1');
    await lookup;
    const dialog = page.getByRole('dialog', { name: '工件資料查詢' });
    await expect(
      dialog.locator('.legacy-query-preview svg path'),
    ).toHaveAttribute('d', 'M0 0H10V10Z');
    await dialog.getByRole('cell', { name: 'MODEL-A', exact: true }).dblclick();
    await expect(model(page)).toHaveValue('MODEL-A');
    await expect(drawing(page)).toHaveValue('D001');
    await expect(page.getByLabel('第 1 列材質', { exact: true })).toHaveValue(
      'SUS',
    );
    await expect(orderNumber(page)).toHaveValue(
      state === 'blank' ? '' : state === 'new' ? 'NEW001' : 'OLD001',
    );
  });
}

test('未新增的查詢不解鎖交易欄位，新增及取消後仍可查詢', async ({ page }) => {
  await openOrders(page);
  await expect(drawing(page)).toBeEditable();
  await expect(model(page)).toBeEditable();
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toBeDisabled();
  await drawing(page).fill('D');
  await page.getByRole('button', { name: '新增 F5', exact: true }).click();
  await expect(orderNumber(page)).toHaveValue('NEW001');
  await expect(drawing(page)).toHaveValue('');
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toBeEditable();
  await page.getByRole('button', { name: '取消 F5', exact: true }).click();
  await expect(orderNumber(page)).toHaveValue('');
  await expect(drawing(page)).toBeEditable();
  await expect(model(page)).toBeEditable();
});

test('唯讀使用者可在空白單查圖，載入既有單據後 F1 不改明細', async ({
  page,
}) => {
  await openOrders(page, 'read');
  await expect(
    page.getByRole('button', { name: '新增 F5', exact: true }),
  ).toBeDisabled();
  await model(page).fill('MODEL');
  await model(page).press('F1');
  await page
    .getByRole('dialog', { name: '工件資料查詢' })
    .getByRole('cell', { name: 'MODEL-A', exact: true })
    .dblclick();
  await expect(drawing(page)).toHaveValue('D001');
  await orderNumber(page).fill('OLD001');
  await orderNumber(page).press('Enter');
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toHaveValue(
    '3',
  );
  await expect(drawing(page)).toHaveAttribute('readonly', '');
  await expect(model(page)).toHaveAttribute('readonly', '');
  await page.route('**/assist/part?**', (route) =>
    route.fulfill({
      json: {
        items: [{ ...part, drawing_no: 'D002', customer_model: 'OTHER' }],
      },
    }),
  );
  await drawing(page).press('F1');
  await page
    .getByRole('dialog', { name: '工件資料查詢' })
    .getByRole('cell', { name: 'D002', exact: true })
    .dblclick();
  await expect(drawing(page)).toHaveValue('D001');
  await expect(model(page)).toHaveValue('MODEL-A');
});
