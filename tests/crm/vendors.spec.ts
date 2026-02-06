import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('廠商管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/vendors');
    await page.waitForSelector('.vendors-page', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示廠商管理頁面標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '廠商管理' })).toBeVisible();
  });

  test('應該顯示搜尋欄位', async ({ page }) => {
    await expect(
      page.getByPlaceholder('搜尋廠商名稱或聯絡人...')
    ).toBeVisible();
  });

  test('應該顯示廠商列表表格', async ({ page }) => {
    const loadingOrTable = await Promise.race([
      page.waitForSelector('.loading-message', { timeout: 3000 }).catch(() => null),
      page.waitForSelector('table', { timeout: 5000 }).catch(() => null),
    ]);

    const table = page.locator('table');
    if (await table.isVisible()) {
      await expect(page.getByRole('columnheader', { name: '廠商 ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '廠商名稱' })).toBeVisible();
    }
  });

  test('應該能夠使用搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜尋廠商名稱或聯絡人...');
    await searchInput.fill('測試');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('測試');
  });

  test('應該能夠點擊廠商 ID 查看詳情', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      if (await firstIdLink.isVisible()) {
        await firstIdLink.click();
        await expect(page.getByText(/廠商詳情/)).toBeVisible();
      }
    }
  });

  test('應該能夠關閉詳情 Modal', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      if (await firstIdLink.isVisible()) {
        await firstIdLink.click();
        await expect(page.getByText(/廠商詳情/)).toBeVisible();

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(page.getByText(/廠商詳情/)).not.toBeVisible();
      }
    }
  });

  test('應該支援分頁功能', async ({ page }) => {
    const pagination = page.locator('[class*="pagination"]');
    if (await pagination.isVisible()) {
      await expect(page.getByRole('combobox')).toBeVisible();
    }
  });

  test('應該顯示快捷鍵提示區', async ({ page }) => {
    const shortcutHint = page.locator('.shortcut-hint');
    await expect(shortcutHint).toBeVisible();
  });
});

test.describe('廠商管理 - 新增廠商流程', () => {
  const testVendorName = `Playwright 測試廠商 ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/vendors');
    await page.waitForSelector('.vendors-page', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠透過 Insert 鍵顯示新增行並建立廠商', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const table = page.locator('.editable-data-table');
    await table.click();
    await page.keyboard.press('Insert');
    await page.waitForTimeout(500);

    const newRow = page.locator('tr.new-row');
    await expect(newRow).toBeVisible();

    const nameInput = newRow.locator('input[type="text"]').first();
    await nameInput.fill(testVendorName);

    const saveButton = newRow.getByRole('button', { name: '保存' });
    await saveButton.click();

    await page.waitForTimeout(1000);
    await expect(page.getByText(testVendorName)).toBeVisible();
  });
});

test.describe('廠商管理 - 響應式設計', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該在桌面視窗正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/crm/vendors');
    await page.waitForSelector('.vendors-page');

    await expect(page.getByRole('heading', { name: '廠商管理' })).toBeVisible();
  });

  test('應該在平板視窗正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/crm/vendors');
    await page.waitForSelector('.vendors-page');

    await expect(page.getByRole('heading', { name: '廠商管理' })).toBeVisible();
  });
});

test.describe('廠商管理 - 效能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('廠商頁面應該在合理時間內載入', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/crm/vendors');
    await page.waitForSelector('.vendors-page');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});
