import { test, expect } from '@playwright/test';
import {
  saleDocumentPages,
  workDocumentPages,
  quoteDocumentPages,
  groupDocumentPages,
  orderDocumentPages,
} from '../../apps/frontend/src/legacy-crm/utils/legacyDocumentPaper';
import { printContentHeight } from '../../apps/frontend/src/legacy-crm/utils/printPaperSize';
import {
  legacyPaperLayouts,
  buildLegacyPages,
} from '../../apps/frontend/src/legacy-crm/utils/legacyPaper';

const context = {
  customer: null,
  shapes: {},
  profile: { name: '測試公司', address: '', phone: '', fax: '' },
};
const items = Array.from({ length: 50 }, (_, i) => ({
  drawing_no: `D${i}`,
  quantity: 1,
  post_process: '折彎',
}));

test('A4 比 B5 容納更多訂單明細，所有圖號完整且字體相同', () => {
  const b5 = orderDocumentPages({ items }, { ...context, paperSize: 'b5' });
  const a4 = orderDocumentPages({ items }, { ...context, paperSize: 'a4' });
  expect(a4.length).toBeLessThan(b5.length);
  for (const pages of [b5, a4]) {
    expect(
      pages
        .flatMap((p) => p.items)
        .filter((i) => /^D\d+$/.test(i.text))
        .map((i) => i.text),
    ).toEqual(items.map((i) => i.drawing_no));
  }
  expect(a4[0].items.find((i) => i.text === 'D0')?.size).toBe(
    b5[0].items.find((i) => i.text === 'D0')?.size,
  );
});

test('一般報表依 B5/A4 重新分頁，不漏印合計', () => {
  const result = {
    items: Array.from({ length: 130 }, (_, i) => ({
      customer_code: `C001`,
      drawing_no: `D${i}`,
      customer_name: `客戶${i}`,
      amount: 1,
    })),
    truncated: false,
  };
  const ctx = {
    ...context,
    company: '測試公司',
    filters: {},
    printDate: '115.10.16',
  };
  const b5 = buildLegacyPages('sales-customer-summary', result, {
    ...ctx,
    paperSize: 'b5',
  });
  const a4 = buildLegacyPages('sales-customer-summary', result, {
    ...ctx,
    paperSize: 'a4',
  });
  expect(b5.length).toBeGreaterThan(0);
  expect(a4.length).toBeLessThan(b5.length);
  for (const pages of [b5, a4]) {
    const text = pages.flatMap((p) => p.items).map((i) => i.text);
    expect(text.filter((value) => /^D\d+$/.test(value))).toEqual(
      result.items.map((i) => i.drawing_no),
    );
    expect(text.filter((value) => value === '合計')).toHaveLength(1);
    expect(text).toContain('130');
  }
});

for (const type of ['order', 'sale', 'quote', 'work', 'group', 'label']) {
  test(`${type} 預設 B5、切換 A4 同步預覽與印出，重開恢復 B5`, async ({
    page,
  }, testInfo) => {
    const logs: Record<string, unknown>[] = [];
    await page.route('**/api/legacy-crm/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/print-log')) {
        logs.push(route.request().postDataJSON());
        await route.fulfill({ status: 204 });
      } else if (path.endsWith('/drawings/shapes')) {
        await route.fulfill({ json: { shapes: {} } });
      } else if (path.includes('/partners/customer/')) {
        await route.fulfill({ json: { item: { full_name: '測試客戶' } } });
      } else {
        await route.fulfill({
          json: {
            item: {
              order_no: 'P001',
              sale_no: 'P001',
              quote_no: 'P001',
              work_no: 'P001',
              group_no: 'P001',
              customer_code: 'C001',
              items: items.map((i) => ({
                ...i,
                customer_model: i.drawing_no,
                customer_drawing_no: i.drawing_no,
                order_quantity: 1,
              })),
            },
          },
        });
      }
    });
    await page.goto(`/tests/fixtures/legacy-paper-size.html?type=${type}`);
    const select = page.getByRole('combobox', { name: '列印紙張' });
    await expect(select).toHaveValue('b5');
    const preview = page.locator('.legacy-preview .legacy-sheet');
    await expect(preview).toHaveClass(/legacy-paper-b5/);
    const b5Count = await page
      .locator('.legacy-print-pages .legacy-sheet')
      .count();
    await select.selectOption('a4');
    await expect(preview).toHaveClass(/legacy-paper-a4/);
    await expect(
      page.locator('.legacy-print-pages .legacy-sheet').first(),
    ).toHaveClass(/legacy-paper-a4/);
    if (type === 'order') {
      await expect(
        page.locator('.legacy-print-pages .legacy-sheet'),
      ).toHaveCount(1);
      expect(b5Count).toBe(2);
    }
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page.getByRole('button', { name: '印出 O' }).click();
    await expect
      .poll(() => logs.filter((l) => l.kind === 'document_print').length)
      .toBe(1);
    expect(logs.at(-1)).toMatchObject({
      criteria: { paper_size: 'a4' },
      page_count: await page
        .locator('.legacy-print-pages .legacy-sheet')
        .count(),
    });
    if (type === 'order') {
      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({
        path: testInfo.outputPath('order-a4.pdf'),
        preferCSSPageSize: true,
      });
      expect(
        pdf.toString('latin1').match(/\/MediaBox\s*\[[^\]]+\]/)?.[0],
      ).toMatch(/594[.\d]* 841[.\d]*/);
      expect(
        (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length,
      ).toBe(1);
      await page
        .locator('.legacy-print-pages .legacy-sheet')
        .screenshot({ path: testInfo.outputPath('order-a4.png') });
      await page.emulateMedia({ media: 'screen' });
    }
    await page.getByRole('button', { name: '關閉 C' }).click();
    await page.getByRole('button', { name: '重新開啟' }).click();
    await expect(select).toHaveValue('b5');
    if (type === 'order') {
      await page.emulateMedia({ media: 'print' });
      const pdf = await page.pdf({
        path: testInfo.outputPath('order-b5.pdf'),
        preferCSSPageSize: true,
      });
      expect(
        pdf.toString('latin1').match(/\/MediaBox\s*\[[^\]]+\]/)?.[0],
      ).toMatch(/498[.\d]* 708[.\d]*/);
      expect(
        (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length,
      ).toBe(2);
    }
  });
}

for (const size of ['b5', 'a4'] as const) {
  test(`${size} 各類單據長明細、簡圖、合計與備註都在紙內`, () => {
    const document = {
      items: Array.from({ length: 99 }, (_, i) => ({
        drawing_no: `D${i}`,
        customer_model: `D${i}`,
        customer_drawing_no: `D${i}`,
        order_quantity: 1,
        quantity: 1,
        post_process: '折彎',
        summary: '測試',
      })),
      notes: Array.from({ length: 50 }, (_, i) => ({
        line_no: i + 1,
        note: `備註${i}`,
      })),
      customer_code: 'C001',
      amount: 100,
      total: 100,
    };
    const ctx = {
      ...context,
      paperSize: size,
      shapes: Object.fromEntries(
        document.items.map((i) => [
          i.drawing_no,
          { path: 'M0 0 L10 10', width: 10, height: 10 },
        ]),
      ),
    };
    for (const builder of [
      orderDocumentPages,
      saleDocumentPages,
      workDocumentPages,
      quoteDocumentPages,
      groupDocumentPages,
    ]) {
      const pages = builder(document, ctx);
      expect(pages.length).toBeGreaterThan(0);
      const identifiers = pages
        .flatMap((p) => p.items)
        .filter((i) => /^D\d+$/.test(i.text))
        .map((i) => i.text);
      // Quote/group layouts contain exactly one identifier; the others may show model too.
      expect(new Set(identifiers).size, builder.name).toBe(99);
      for (const page of pages) {
        for (const item of page.items) {
          expect(
            item.y + item.size * 0.2,
            `${builder.name}: ${item.text}`,
          ).toBeLessThan(printContentHeight(size));
        }
        for (const rule of page.rules)
          expect(rule.y2 ?? rule.y ?? 0, builder.name).toBeLessThan(
            printContentHeight(size),
          );
        for (const shape of page.shapes ?? [])
          expect(shape.y + shape.height, builder.name).toBeLessThan(
            printContentHeight(size),
          );
      }
      if (builder === quoteDocumentPages)
        expect(
          pages.flatMap((p) => p.items).filter((i) => /^備註\d+$/.test(i.text)),
        ).toHaveLength(50);
    }
  });

  test(`${size} 所有報表格式與請款單皆套用紙張且不超出下緣`, () => {
    const rows = Array.from({ length: 170 }, (_, i) => ({
      drawing_no: `D${i}`,
      customer_code: 'C001',
      customer_name: '測試客戶',
      quantity: 1,
      amount: 1,
      sale_no: `S${i}`,
    }));
    const ctx = {
      ...context,
      paperSize: size,
      company: '測試公司',
      filters: {},
      printDate: '115.10.16',
    };
    for (const key of Object.keys(legacyPaperLayouts)) {
      const pages = buildLegacyPages(
        key,
        {
          items: rows,
          pages: [
            {
              customer: { name: '測試客戶', code: 'C001' },
              sales: rows.map((row) => ({ ...row, items: [row] })),
              totals: { amount: 170, receivable: 170 },
            },
          ],
        },
        ctx,
      );
      expect(pages.length, key).toBeGreaterThan(0);
      for (const page of pages) {
        expect(page.paper, key).toBe(size);
        for (const item of page.items)
          expect(item.y + item.size * 0.2, `${key}: ${item.text}`).toBeLessThan(
            printContentHeight(size),
          );
        for (const rule of page.rules)
          expect(rule.y2 ?? rule.y ?? 0, key).toBeLessThan(
            printContentHeight(size),
          );
      }
    }
  });
}

test('真實報表預覽切換紙張後回到首頁、重新查詢預設 B5', async ({ page }) => {
  await page.route('**/api/legacy-crm/**', async (route) => {
    if (route.request().url().includes('/catalog'))
      await route.fulfill({
        json: {
          items: [
            {
              key: 'order-unshipped',
              title: '未交貨工件明細表',
              available: true,
            },
          ],
        },
      });
    else if (route.request().method() === 'POST')
      await route.fulfill({ status: 204 });
    else
      await route.fulfill({
        json: {
          items: items.map((i) => ({
            ...i,
            order_no: 'P001',
            customer_code: 'C001',
          })),
          truncated: false,
        },
      });
  });
  await page.goto('/tests/fixtures/legacy-paper-size.html?type=report');
  await page.getByRole('button', { name: '確　定' }).click();
  const select = page.getByRole('combobox', { name: '列印紙張' });
  await expect(select).toHaveValue('b5');
  await select.selectOption('a4');
  await expect(page.locator('.legacy-preview .legacy-sheet')).toHaveClass(
    /legacy-paper-a4/,
  );
  await expect(
    page.locator('.legacy-print-pages .legacy-sheet').first(),
  ).toHaveClass(/legacy-paper-a4/);
  await page.getByRole('button', { name: '關閉 C' }).click();
  await page.getByRole('button', { name: '確　定' }).click();
  await expect(select).toHaveValue('b5');
});
