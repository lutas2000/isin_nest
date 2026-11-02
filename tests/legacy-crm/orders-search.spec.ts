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
      case '/partners/customer/C001':
        result = { item: customer };
        break;
      case '/partners':
      case '/assist/customer':
        result = { items: [customer] };
        break;
      case '/banks':
      case '/reports/catalog':
      case '/orders':
        result = { items: [] };
        break;
      case '/parts/D/orders':
      case '/parts/D001/orders':
        result = { items: [] };
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
      case '/quotes/LONG':
      case '/receipts/LONG':
      case '/sales/LONG':
      case '/work-orders/LONG':
      case '/groups/LONG':
        result = {
          item: {
            quote_no: 'LONG',
            receipt_no: 'LONG',
            payments: [{ line_no: 1 }],
            sale_no: 'LONG',
            work_no: 'LONG',
            group_no: 'LONG',
            items: [{ ...part, line_no: 1 }],
          },
        };
        break;
      case '/orders/OLD001':
        result = { item: order };
        break;
      case '/documents/orders/next-number':
        result = { number: 'NEW001' };
        break;
      default:
        if (url.pathname.includes('/partners/customer/')) {
          await route.fulfill({ status: 404, json: { message: '查無客戶' } });
          return;
        }
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
    customer.short_name,
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

test('電腦圖號可完整輸入 12 碼，並以完整圖號執行 F1 查詢', async ({ page }) => {
  await openOrders(page);
  const number = 'D12345678901';
  await drawing(page).pressSequentially(number + 'X');
  await expect(drawing(page)).toHaveValue(number);
  const lookup = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith('/assist/part') &&
      url.searchParams.get('prefix') === number
    );
  });
  await drawing(page).press('F1');
  await lookup;
});

for (const view of ['parts', 'sales', 'work', 'groups']) {
  test(`${view}：電腦圖號輸入上限為 12 碼`, async ({ page }) => {
    await page.goto(`/tests/fixtures/legacy-orders.html?view=${view}`);
    const key = page.locator('.legacy-form-field input').first();
    if (view !== 'parts') {
      await key.fill('LONG');
      await key.press('Enter');
    }
    const field =
      view === 'parts'
        ? page.locator('input[data-field="drawing_no"]')
        : drawing(page);
    await expect(field).toBeEditable();
    await field.fill('');
    await field.pressSequentially('D12345678901X');
    await expect(field).toHaveValue('D12345678901');
  });
}

// Enter 與 Tab 使用相同欄位順序，但不進入唯讀欄位或執行存檔。
test('Enter：訂單新增的日期與客戶代碼依序跳欄，客戶名稱先帶入', async ({
  page,
}) => {
  await openOrders(page);
  await page.getByRole('button', { name: '新增 F5', exact: true }).click();
  const date = page
    .locator('.legacy-form-field')
    .filter({ hasText: '訂單日期' })
    .locator('input');
  const delivery = page
    .locator('.legacy-form-field')
    .filter({ hasText: '交貨日期' })
    .locator('input');
  await date.press('Enter');
  await expect(delivery).toBeFocused();
  const code = page.getByLabel('客戶編號', { exact: true });
  await code.fill('C001');
  await code.press('Enter');
  const name = page.getByLabel('客戶名稱', { exact: true });
  await expect(name).toHaveValue(customer.short_name);
  await expect(name).toBeFocused();
});

for (const view of [
  'orders',
  'sales',
  'work',
  'groups',
  'quotes',
  'receipts',
]) {
  test(`Enter：${view} 明細向右跳欄，行末跳下一行`, async ({ page }) => {
    await page.goto(`/tests/fixtures/legacy-orders.html?view=${view}`);
    const number = page.locator('.legacy-form-field input').first();
    await number.fill(view === 'orders' ? 'OLD001' : 'LONG');
    await number.press('Enter');
    await page.getByRole('button', { name: '更新 F6', exact: true }).click();
    const rows = page.locator('tbody tr[data-index]');
    const inputs = rows
      .first()
      .locator(
        'input:not([readonly]):not([disabled]):not([tabindex="-1"]), select:not([disabled])',
      );
    await inputs.first().press('Enter');
    await expect(inputs.nth(1)).toBeFocused();
    await inputs.last().press('Enter');
    await expect(
      rows
        .nth(1)
        .locator(
          'input:not([readonly]):not([disabled]):not([tabindex="-1"]), select:not([disabled])',
        )
        .first(),
    ).toBeFocused();
  });
}

test('Enter：跳過不可編輯與隱藏欄位，保留選字、換行、按鈕與視窗邊界', async ({
  page,
}) => {
  await openOrders(page);
  await page.locator('.legacy-root').evaluate((root) => {
    root.insertAdjacentHTML(
      'beforeend',
      `<section class="legacy-form" id="enter-case">
      <input id="enter-first"><input readonly><input disabled><input hidden><input style="display:none"><input tabindex="-1">
      <select id="enter-select"><option>A</option></select><textarea id="enter-note"></textarea>
      <button id="enter-save">存檔</button><input id="enter-last">
    </section><section class="legacy-form"><input id="other-window"></section>`,
    );
  });
  const first = page.locator('#enter-first');
  await first.press('Enter');
  await expect(page.locator('#enter-select')).toBeFocused();
  await page.locator('#enter-select').press('Enter');
  await expect(page.locator('#enter-note')).toBeFocused();
  await page.locator('#enter-note').press('Enter');
  await expect(page.locator('#enter-note')).toHaveValue('\n');
  await first.focus();
  await first.dispatchEvent('keydown', {
    key: 'Enter',
    isComposing: true,
    bubbles: true,
  });
  await expect(first).toBeFocused();
  await page.locator('#enter-save').evaluate((button) => {
    button.addEventListener('click', () =>
      button.setAttribute('data-clicked', 'true'),
    );
  });
  await page.locator('#enter-save').press('Enter');
  await expect(page.locator('#enter-save')).toHaveAttribute(
    'data-clicked',
    'true',
  );
  await page.locator('#enter-last').press('Enter');
  await expect(page.locator('#enter-last')).toBeFocused();
});

test('Enter：單號仍載入舊訂單，中文選字不觸發單號查詢', async ({ page }) => {
  await openOrders(page);
  const number = orderNumber(page);
  await number.fill('OLD001');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await number.dispatchEvent('keydown', {
    key: 'Enter',
    isComposing: true,
    bubbles: true,
  });
  await expect(drawing(page)).toHaveValue('');
  expect(requests.filter((url) => url.includes('/orders/OLD001'))).toHaveLength(
    0,
  );
  await number.press('Enter');
  await expect(drawing(page)).toHaveValue('D001');
});

for (const [view, kind] of [
  ['parts', ''],
  ['partners', 'customer'],
  ['partners', 'supplier'],
  ['master', 'materials'],
  ['master', 'banks'],
  ['master', 'phrases'],
  ['master', 'postal-codes'],
]) {
  test(`Enter：基本資料 ${view}/${kind} 新增依序跳欄且不重複跳欄`, async ({
    page,
  }) => {
    await page.goto(
      `/tests/fixtures/legacy-orders.html?view=${view}&kind=${kind}`,
    );
    await page.getByRole('button', { name: '新增 F5', exact: true }).click();
    const fields = page.locator(
      '.legacy-master-fields input:not([disabled]):not([readonly])',
    );
    await fields.first().press('Enter');
    await expect(fields.nth(1)).toBeFocused();
    await fields.nth(1).press('Enter');
    if ((await fields.count()) > 2) await expect(fields.nth(2)).toBeFocused();
    else await expect(fields.nth(1)).toBeFocused();
  });
}

test('Enter：報表條件跳下一欄，不直接執行報表', async ({ page }) => {
  await page.goto('/tests/fixtures/legacy-orders.html?view=reports');
  const fields = page.locator('.legacy-field input');
  await fields.first().press('Enter');
  await expect(fields.nth(1)).toBeFocused();
  await fields.last().press('Enter');
  await expect(fields.last()).toBeFocused();
});

test('Enter：查詢視窗保留選取功能', async ({ page }) => {
  await openOrders(page);
  await page.getByLabel('客戶編號', { exact: true }).press('F1');
  const dialog = page.getByRole('dialog', { name: '客戶資料查詢' });
  await expect(
    dialog.getByRole('cell', { name: 'C001', exact: true }),
  ).toBeVisible();
  await dialog.locator('.legacy-selection-grid').first().press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('客戶編號', { exact: true })).toHaveValue(
    'C001',
  );
});

const shortNameCustomers = [
  { code: '111', full_name: '臨時客戶有限公司', short_name: '臨時' },
  { code: 'VBU', full_name: '新益精密工業有限公司', short_name: '新益' },
  { code: 'NO-SHORT', full_name: '只有全名有限公司', short_name: '' },
];

async function mockExactCustomers(page: Page) {
  // These customers are deliberately absent from the initial (limited) list.
  await page.route('**/api/legacy-crm/partners/customer/*', async (route) => {
    expect(route.request().method()).toBe('GET');
    const code = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').at(-1)!,
    );
    const item = shortNameCustomers.find((entry) => entry.code === code);
    await route.fulfill({
      status: item ? 200 : code === 'FAIL' ? 503 : 404,
      json: item ? { item } : { message: '查無客戶或無法讀取' },
    });
  });
}

for (const state of ['blank', 'new', 'cancelled', 'read-only']) {
  test(`客戶簡稱 ${state}：111 → 清空 → VBU → 未知代碼，不保留舊名稱`, async ({
    page,
  }) => {
    await mockExactCustomers(page);
    await openOrders(page, state === 'read-only' ? 'read' : 'write');
    if (state === 'new' || state === 'cancelled') {
      await page.getByRole('button', { name: '新增 F5', exact: true }).click();
      await expect(orderNumber(page)).toHaveValue('NEW001');
      if (state === 'cancelled') {
        await page
          .getByRole('button', { name: '取消 F5', exact: true })
          .click();
      }
    }
    const code = page.getByLabel('客戶編號', { exact: true });
    const name = page.getByLabel('客戶名稱', { exact: true });
    await code.fill('111');
    await expect(name).toHaveValue('臨時');
    await code.fill('');
    await expect(name).toHaveValue('');
    await code.pressSequentially('VBU');
    await expect(name).toHaveValue('新益');
    await code.fill('111');
    await expect(name).toHaveValue('臨時');
    await code.fill('VBU');
    await expect(name).toHaveValue('新益');
    for (const value of ['MISSING', 'FAIL', 'NO-SHORT', '']) {
      await code.fill(value);
      await code.press('Tab');
      await expect(name).toHaveValue('');
    }
    await expect(orderNumber(page)).toHaveValue(
      state === 'new' ? 'NEW001' : '',
    );
  });
}

for (const next of ['VBU', '', 'cancel']) {
  test(`客戶簡稱：較慢的 111 回應不覆蓋 ${next || '清空'} 後的畫面`, async ({
    page,
  }) => {
    await mockExactCustomers(page);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      '**/api/legacy-crm/partners/customer/111',
      async (route) => {
        await pending;
        await route.fulfill({ json: { item: shortNameCustomers[0] } });
      },
    );
    await openOrders(page);
    const code = page.getByLabel('客戶編號', { exact: true });
    const name = page.getByLabel('客戶名稱', { exact: true });
    if (next === 'cancel') {
      await page.getByRole('button', { name: '新增 F5', exact: true }).click();
      await expect(orderNumber(page)).toHaveValue('NEW001');
    }
    const request = page.waitForRequest('**/partners/customer/111');
    await code.fill('111');
    await request;
    if (next === 'cancel') {
      await page.getByRole('button', { name: '取消 F5', exact: true }).click();
    } else {
      await code.fill(next);
    }
    await expect(name).toHaveValue(next === 'VBU' ? '新益' : '');
    const response = page.waitForResponse('**/partners/customer/111');
    release();
    await response;
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await expect(name).toHaveValue(next === 'VBU' ? '新益' : '');
  });
}

test('舊訂單顯示簡稱，未修改即可列印公司全名與英文代碼', async ({ page }) => {
  await mockExactCustomers(page);
  await page.route('**/api/legacy-crm/orders/OLD001', (route) =>
    route.fulfill({
      json: {
        item: { ...order, customer_code: 'VBU', customer_name: '舊的全名' },
      },
    }),
  );
  await page.route('**/api/legacy-crm/print-log', (route) =>
    route.fulfill({ status: 204 }),
  );
  await openOrders(page);
  await orderNumber(page).fill('OLD001');
  await orderNumber(page).press('Enter');
  await expect(page.getByLabel('客戶名稱', { exact: true })).toHaveValue(
    '新益',
  );
  await page.getByRole('button', { name: '列印 P', exact: true }).click();
  const preview = page.getByRole('dialog', { name: '訂貨單預覽', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('新益精密工業有限公司');
  await expect(preview).toContainText('[VBU]');
});

for (const view of ['quotes', 'work']) {
  test(`${view}：既有客戶代碼與 F1 名稱帶入維持原有行為`, async ({ page }) => {
    await page.goto(`/tests/fixtures/legacy-orders.html?view=${view}`);
    const number = page.locator('.legacy-form-field').first().locator('input');
    await number.fill('LONG');
    await number.press('Enter');
    await expect(
      page.getByRole('button', { name: '列印 P', exact: true }),
    ).toBeEnabled();
    const code = page.getByLabel('客戶編號', { exact: true });
    const name = page.getByLabel('客戶名稱', { exact: true });
    await code.fill('C001');
    await code.press('Tab');
    await expect(name).toHaveValue(customer.full_name);
    await code.fill('C');
    await code.press('F1');
    await page
      .getByRole('dialog', { name: '客戶資料查詢' })
      .getByRole('cell', { name: 'C001', exact: true })
      .dblclick();
    await expect(code).toHaveValue('C001');
    await expect(name).toHaveValue(customer.full_name);
  });
}
