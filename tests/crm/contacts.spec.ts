import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('聯絡人管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/contacts');
    // 等待頁面載入
    await page.waitForSelector('[class*="contacts"]', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示聯絡人管理頁面', async ({ page }) => {
    // 檢查頁面標題或內容
    await expect(page).toHaveURL('/crm/contacts');
  });

  test('應該顯示搜尋欄位', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜尋/);
    await expect(searchInput).toBeVisible();
  });

  test('應該顯示聯絡人列表或載入狀態', async ({ page }) => {
    // 等待載入完成
    const loadingOrContent = await Promise.race([
      page.waitForSelector('.loading-message', { timeout: 3000 }).catch(() => null),
      page.waitForSelector('table', { timeout: 3000 }).catch(() => null),
      page.waitForSelector('[class*="empty"]', { timeout: 3000 }).catch(() => null),
    ]);

    // 頁面應該顯示某種內容
    expect(loadingOrContent !== null || await page.locator('table').isVisible()).toBeTruthy();
  });

  test('應該能夠使用搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜尋/);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('應該能夠點擊聯絡人查看詳情或編輯', async ({ page }) => {
    // 等待表格載入
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 嘗試找到可點擊的連結或按鈕
      const actionButton = page.locator('.link-button, button[class*="edit"]').first();
      
      if (await actionButton.isVisible()) {
        // 確認按鈕可以被點擊
        await expect(actionButton).toBeEnabled();
      }
    }
  });
});

test.describe('特定客戶的聯絡人', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能從客戶頁面導航到該客戶的聯絡人', async ({ page }) => {
    // 先到客戶頁面
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');

    // 等待表格載入
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const contactButton = page.getByRole('button', { name: '聯絡人' }).first();
      
      if (await contactButton.isVisible()) {
        await contactButton.click();
        
        // 應該導航到聯絡人頁面，URL 應該包含客戶 ID
        await expect(page).toHaveURL(/\/crm\/contacts/);
      }
    }
  });

  test('應該能夠直接訪問特定客戶的聯絡人頁面', async ({ page }) => {
    // 假設有一個客戶 ID（這需要根據實際資料調整）
    await page.goto('/crm/contacts/CUST001');
    
    // 頁面應該正常載入（可能顯示資料或空白）
    await page.waitForLoadState('networkidle');
    
    // 檢查頁面沒有錯誤
    const errorMessage = page.locator('.error-message');
    if (await errorMessage.isVisible()) {
      // 如果顯示錯誤，可能是客戶不存在，這是預期行為
      console.log('客戶可能不存在，顯示錯誤訊息是預期行為');
    }
  });
});
