import { expect, test, type Page } from '@playwright/test';

const lines = Array.from({ length: 5 }, (_, index) => ({
  drawing_no: `P${index + 1}`,
  customer_model: `MODEL-${index + 1}`,
  material: 'SUS',
  thickness: '2',
  outsource: '代',
  unit: '片',
  quantity: '10',
  shipped: index === 4 ? '7' : '10',
}));
const order = {
  order_no: 'OPEN001',
  customer_code: 'C001',
  customer_name: '未完成訂單客戶',
  payment_method: '月結',
  delivery_method: '送達客戶',
  lines,
};
const linkedOrder = (page: Page) =>
  page.getByLabel('訂單編號', { exact: true });
const saleNumber = (page: Page) => page.getByLabel('出貨編號', { exact: true });

async function chooseOrder(page: Page) {
  const dialog = page.getByRole('dialog', { name: '訂單資料查詢' });
  await dialog
    .getByRole('cell', { name: order.order_no, exact: true })
    .dblclick();
  await expect(dialog).not.toBeVisible();
}

async function expectRemainingLines(page: Page) {
  await expect(page.getByLabel('第 1 列電腦圖號', { exact: true })).toHaveValue(
    'P5',
  );
  await expect(page.getByLabel('第 1 列客戶型號', { exact: true })).toHaveValue(
    'MODEL-5',
  );
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toHaveValue(
    '3.00',
  );
  await expect(page.getByLabel('第 2 列電腦圖號', { exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByLabel('客戶編號', { exact: true })).toHaveValue(
    'C001',
  );
  await expect(linkedOrder(page)).toHaveValue('OPEN001');
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    !testInfo.config.metadata.ordersSearchFixture,
    '使用 orders-search.config.ts 執行',
  );
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    expect(request.method(), '查詢及帶入流程不可寫入資料').toBe('GET');
    const url = new URL(request.url());
    let result: unknown;
    switch (url.pathname.replace('/api/legacy-crm', '')) {
      case '/parts':
        result = { items: [] };
        break;
      case '/partners':
        result = {
          items: [
            {
              code: 'C001',
              full_name: order.customer_name,
              shipping_address: '測試地址',
            },
          ],
        };
        break;
      case '/assist/open-order':
        result = { items: [order] };
        break;
      case '/documents/sales/next-number':
        result = { number: 'NEW001' };
        break;
      case '/sales/OLD001':
        result = {
          item: {
            sale_no: 'OLD001',
            customer_code: 'OLD',
            linked_order_no: 'OLDORDER',
            items: [{ line_no: 1, drawing_no: 'OLDPART', quantity: '2' }],
          },
        };
        break;
      default:
        throw new Error(`未預期 API: ${url.pathname}`);
    }
    await route.fulfill({ json: result });
  });
});

for (const permission of ['write', 'read']) {
  test(`未新增 ${permission}：雙擊查全部訂單，只帶入未完成品項及剩餘數量但不新增單據`, async ({
    page,
  }) => {
    await page.goto(
      `/tests/fixtures/legacy-orders.html?view=sales&permission=${permission}`,
    );
    await linkedOrder(page).fill('PREFIX');
    await page.getByLabel('客戶編號', { exact: true }).fill('OTHER');
    const lookup = page.waitForRequest('**/assist/open-order');
    await linkedOrder(page).dblclick();
    await lookup;
    await chooseOrder(page);
    await expectRemainingLines(page);
    await expect(saleNumber(page)).toHaveValue('');
    await expect(
      page.getByLabel('第 1 列數量', { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: '新增 F5', exact: true }),
    ).toBeVisible();
  });
}

test('新增：雙擊只帶入未完成品項，剩餘數量及資料可修改', async ({ page }) => {
  await page.goto('/tests/fixtures/legacy-orders.html?view=sales');
  await page.getByRole('button', { name: '新增 F5', exact: true }).click();
  await linkedOrder(page).dblclick();
  await chooseOrder(page);
  await expectRemainingLines(page);
  await expect(saleNumber(page)).toHaveValue('NEW001');
  await expect(page.getByLabel('第 1 列材質', { exact: true })).toHaveValue(
    'SUS',
  );
  await expect(page.getByLabel('第 1 列代料', { exact: true })).toHaveValue(
    '代',
  );
  await page.getByLabel('第 1 列數量', { exact: true }).fill('1');
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toHaveValue(
    '1',
  );
  await page.getByRole('button', { name: '取消 F5', exact: true }).click();
  await linkedOrder(page).dblclick();
  await chooseOrder(page);
  await expectRemainingLines(page);
  await expect(saleNumber(page)).toHaveValue('');
});

test('F1 保留單號前綴及客戶篩選，取消清單不變更內容', async ({ page }) => {
  await page.goto('/tests/fixtures/legacy-orders.html?view=sales');
  await linkedOrder(page).fill('OPEN');
  await page.getByLabel('客戶編號', { exact: true }).fill('C001');
  const lookup = page.waitForRequest(
    '**/assist/open-order?prefix=OPEN&customer=C001',
  );
  await linkedOrder(page).press('F1');
  await lookup;
  await page.getByRole('dialog', { name: '訂單資料查詢' }).press('Escape');
  await expect(linkedOrder(page)).toHaveValue('OPEN');
  await expect(page.getByLabel('第 1 列電腦圖號', { exact: true })).toHaveValue(
    '',
  );
});

test('唯讀舊銷貨單：可雙擊查詢，選取不改動既有單據', async ({ page }) => {
  await page.goto(
    '/tests/fixtures/legacy-orders.html?view=sales&permission=read',
  );
  await saleNumber(page).fill('OLD001');
  await saleNumber(page).press('Enter');
  await expect(linkedOrder(page)).toHaveValue('OLDORDER');
  await linkedOrder(page).dblclick();
  await chooseOrder(page);
  await expect(linkedOrder(page)).toHaveValue('OLDORDER');
  await expect(page.getByLabel('客戶編號', { exact: true })).toHaveValue('OLD');
  await expect(page.getByLabel('第 1 列電腦圖號', { exact: true })).toHaveValue(
    'OLDPART',
  );
});

test('不帶入超出貨品項，超過十五項不截斷', async ({ page }) => {
  await page.route('**/assist/open-order', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            ...order,
            lines: Array.from({ length: 18 }, (_, index) => ({
              ...lines[0],
              drawing_no: `LONG${index}`,
              shipped: index === 0 ? '12' : '0',
            })),
          },
        ],
      },
    }),
  );
  await page.goto('/tests/fixtures/legacy-orders.html?view=sales');
  await linkedOrder(page).dblclick();
  await chooseOrder(page);
  await expect(page.getByLabel('第 1 列數量', { exact: true })).toHaveValue(
    '10.00',
  );
  await expect(page.getByLabel('第 1 列電腦圖號', { exact: true })).toHaveValue(
    'LONG1',
  );
  await expect(
    page.getByLabel('第 17 列電腦圖號', { exact: true }),
  ).toHaveValue('LONG17');
  await expect(page.getByLabel('第 17 列數量', { exact: true })).toHaveValue(
    '10.00',
  );
});
