import { test, expect } from '@playwright/test';
import {
  orderDocumentPages,
  textWidth,
} from '../../apps/frontend/src/legacy-crm/utils/legacyDocumentPaper';

const ctx = {
  customer: null,
  shapes: {},
  profile: { name: '測試公司', address: '', phone: '', fax: '' },
};
const detail = (post_process: string, drawing_no = 'D001') => ({
  drawing_no,
  post_process,
  quantity: 1,
  unit: '片',
});
const processes = (page: ReturnType<typeof orderDocumentPages>[number]) =>
  page.items.filter((item) => item.x === 627.22 && item.y > 166.4);

test('短後加工保留原本位置與單頁十筆配置', () => {
  const pages = orderDocumentPages(
    { items: Array.from({ length: 10 }, () => detail('折彎')) },
    ctx,
  );
  expect(pages).toHaveLength(1);
  expect(processes(pages[0])).toHaveLength(10);
  expect(processes(pages[0])[0]).toMatchObject({ text: '折彎', y: 181.76 });
});

for (const content of [
  '折彎攻牙沉孔焊接研磨烤漆電鍍包裝',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  '折彎M3攻牙→焊接TIG→研磨#400→烤漆',
  '加'.repeat(50),
]) {
  test(`後加工完整換行且不超出欄寬：${content}`, () => {
    const pages = orderDocumentPages(
      { items: [detail(content), detail('包裝', 'NEXT')] },
      ctx,
    );
    const lines = processes(pages[0]).filter((item) => item.text !== '包裝');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((line) => line.text).join('')).toBe(content);
    for (const page of pages) {
      for (const line of processes(page)) {
        expect(line.x + textWidth(line.text, line.size)).toBeLessThan(716.8);
        expect(line.y + line.size * 0.2).toBeLessThan(371.2);
      }
    }
    const next = pages
      .flatMap((page) => page.items)
      .find((item) => item.text === 'NEXT');
    if (pages.length === 1) expect(next!.y).toBeGreaterThan(lines.at(-1)!.y);
  });
}

test('多行明細整筆移至次頁，項次連續且空白標記不覆蓋內容', () => {
  const pages = orderDocumentPages(
    {
      items: [
        ...Array.from({ length: 9 }, (_, index) => detail('', `D${index + 1}`)),
        detail('折彎攻牙沉孔焊接研磨烤漆', 'TENTH'),
        detail('', 'ELEVENTH'),
      ],
    },
    ctx,
  );
  expect(pages).toHaveLength(2);
  expect(pages[0].items.some((item) => item.text === 'TENTH')).toBe(false);
  expect(pages[1].items.find((item) => item.text === 'TENTH')?.y).toBe(181.76);
  expect(
    pages[1].items
      .filter((item) => item.x === 12.8 && item.y > 166.4 && item.y < 371.2)
      .map((item) => item.text.trim()),
  ).toEqual(['10', '11']);
  const last = pages[1].items.find((item) => item.text === 'ELEVENTH')!;
  expect(
    pages[1].items.find((item) => item.text === '<以下空白>')!.y,
  ).toBeGreaterThan(last.y);
  expect(pages[1].items.some((item) => item.text === '頁    次：2/2')).toBe(
    true,
  );
});

test('空訂單仍有表頭、簽核及空白標記', () => {
  const pages = orderDocumentPages({ items: [] }, ctx);
  expect(pages).toHaveLength(1);
  expect(pages[0].items.some((item) => item.text === '<以下空白>')).toBe(true);
});

test('實際列印樣式下後加工不越過右框、不壓到下一筆', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.config.metadata.ordersSearchFixture,
    '請使用獨立回歸測試設定',
  );
  await page.goto('/tests/fixtures/legacy-order-print.html');
  await page.emulateMedia({ media: 'print' });
  const sheet = page.locator('.legacy-sheet');
  await expect(sheet).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const bounds = await sheet.evaluate((element) => {
    const spans = [
      ...element.querySelectorAll<HTMLElement>('.legacy-sheet-text'),
    ];
    const lines = spans
      .filter((span) =>
        ['折彎攻牙沉', '孔焊接研磨', '烤漆電鍍包', '裝'].includes(
          span.textContent ?? '',
        ),
      )
      .map((span) => {
        const rect = span.getBoundingClientRect();
        return { right: rect.right, bottom: rect.bottom };
      });
    const right = [
      ...element.querySelectorAll<HTMLElement>('.legacy-sheet-vrule'),
    ].reduce(
      (max, rule) => Math.max(max, rule.getBoundingClientRect().left),
      0,
    );
    const next = spans
      .find((span) => span.textContent === 'NEXT')!
      .getBoundingClientRect();
    return { lines, right, nextTop: next.top };
  });
  expect(bounds.lines).toHaveLength(4);
  for (const line of bounds.lines) {
    expect(line.right).toBeLessThan(bounds.right);
    expect(line.bottom).toBeLessThan(bounds.nextTop);
  }
  await sheet.screenshot({ path: testInfo.outputPath('order-print.png') });
});
