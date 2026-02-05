import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('CRM 導航功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠從首頁導航到客戶管理', async ({ page }) => {
    await page.goto('/');
    
    // 找到 CRM 或客戶管理的導航連結
    const crmLink = page.getByRole('link', { name: /客戶|CRM/ }).first();
    
    if (await crmLink.isVisible()) {
      await crmLink.click();
      await expect(page).toHaveURL('/crm');
    }
  });

  test('應該能夠在 CRM 子頁面之間導航', async ({ page }) => {
    // 從客戶管理開始
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');

    // 導航到報價單管理
    const quotesLink = page.getByRole('link', { name: /報價/ });
    if (await quotesLink.isVisible()) {
      await quotesLink.click();
      await expect(page).toHaveURL(/\/crm\/quotes/);
    }

    // 導航到訂貨單管理
    const ordersLink = page.getByRole('link', { name: /訂貨單|Orders/ });
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page).toHaveURL(/\/crm\/orders/);
    }
  });

  test('應該能夠使用瀏覽器返回按鈕', async ({ page }) => {
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');

    await page.goto('/crm/quotes');
    await page.waitForLoadState('networkidle');

    // 使用瀏覽器返回
    await page.goBack();
    
    // 應該返回到客戶頁面
    await expect(page).toHaveURL('/crm');
  });

  test('應該在導航時保持登入狀態', async ({ page }) => {
    // 多次導航
    await page.goto('/crm');
    await page.goto('/crm/quotes');
    await page.goto('/crm/orders');
    await page.goto('/crm/contacts');

    // 驗證仍然是登入狀態
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).not.toBeNull();

    // 應該不會被重導向到登入頁面
    await expect(page).not.toHaveURL('/login');
  });

  test('應該正確顯示頁面標題', async ({ page }) => {
    // 客戶管理頁面
    await page.goto('/crm');
    await expect(page).toHaveTitle(/客戶/);

    // 報價管理頁面
    await page.goto('/crm/quotes');
    await expect(page).toHaveTitle(/報價/);

    // 訂貨單管理頁面
    await page.goto('/crm/orders');
    await expect(page).toHaveTitle(/訂貨單/);
  });
});

test.describe('CRM 端到端流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠完整瀏覽客戶相關資訊', async ({ page }) => {
    // 1. 前往客戶列表
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');

    // 2. 如果有客戶資料，點擊查看詳情
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        const customerId = await firstIdLink.textContent();
        await firstIdLink.click();
        
        // 3. 應該顯示客戶詳情 Modal
        await expect(page.getByText('客戶詳情')).toBeVisible();
        
        // 4. 關閉詳情 Modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // 5. 點擊聯絡人按鈕
        const contactButton = page.getByRole('button', { name: '聯絡人' }).first();
        if (await contactButton.isVisible()) {
          await contactButton.click();
          
          // 6. 應該導航到該客戶的聯絡人頁面
          await expect(page).toHaveURL(/\/crm\/contacts/);
        }
      }
    }
  });

  test('應該能夠搜尋和篩選資料', async ({ page }) => {
    // 在報價單頁面測試搜尋和篩選
    await page.goto('/crm/quotes');
    await page.waitForSelector('.quotes-page');
    await page.waitForLoadState('networkidle');

    // 1. 輸入搜尋關鍵字
    const searchInput = page.getByPlaceholder('搜尋報價單編號或客戶...');
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // 2. 清除搜尋
    await searchInput.clear();
    await page.waitForTimeout(500);

    // 3. 使用狀態篩選
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('pending');
      await page.waitForTimeout(500);
      
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);
      
      await statusFilter.selectOption('');
    }
  });
});

test.describe('響應式設計', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該在桌面視窗正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');

    // 檢查主要元素是否可見
    await expect(page.getByRole('heading', { name: '客戶管理' })).toBeVisible();
    await expect(page.getByRole('button', { name: /新增客戶/ })).toBeVisible();
  });

  test('應該在平板視窗正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');

    // 檢查主要元素是否可見
    await expect(page.getByRole('heading', { name: '客戶管理' })).toBeVisible();
  });

  test('應該在手機視窗正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');

    // 檢查主要元素是否可見
    await expect(page.getByRole('heading', { name: '客戶管理' })).toBeVisible();
  });
});

test.describe('錯誤處理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該處理不存在的頁面', async ({ page }) => {
    await page.goto('/crm/nonexistent');
    
    // 頁面應該正常載入（可能顯示 404 或重導向）
    await page.waitForLoadState('networkidle');
  });

  test('應該處理不存在的訂貨單 ID', async ({ page }) => {
    await page.goto('/crm/orders/NONEXISTENT/items');
    
    // 頁面應該正常載入
    await page.waitForLoadState('networkidle');
    
    // 可能顯示錯誤訊息或空白內容
  });

  test('應該處理不存在的報價單 ID', async ({ page }) => {
    await page.goto('/crm/quotes/NONEXISTENT/items');
    
    // 頁面應該正常載入
    await page.waitForLoadState('networkidle');
  });
});

test.describe('效能相關', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('客戶頁面應該在合理時間內載入', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 頁面應該在 5 秒內載入完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('報價單頁面應該在合理時間內載入', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/crm/quotes');
    await page.waitForSelector('.quotes-page');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });

  test('訂貨單頁面應該在合理時間內載入', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
  });
});
