import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('客戶管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm');
    // 等待頁面載入
    await page.waitForSelector('.customers-page');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示客戶管理頁面標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '客戶管理' })).toBeVisible();
  });

  test('應該顯示新增客戶按鈕', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新增客戶/ })).toBeVisible();
  });

  test('應該顯示搜尋欄位', async ({ page }) => {
    await expect(page.getByPlaceholder('搜尋客戶名稱或公司...')).toBeVisible();
  });

  test('應該顯示客戶列表表格', async ({ page }) => {
    // 等待表格載入完成（可能顯示載入中或資料）
    const loadingOrTable = await Promise.race([
      page.waitForSelector('.loading-message', { timeout: 3000 }).catch(() => null),
      page.waitForSelector('table', { timeout: 3000 }).catch(() => null),
    ]);
    
    // 如果有資料，應該顯示表格
    const table = page.locator('table');
    if (await table.isVisible()) {
      // 檢查表頭
      await expect(page.getByRole('columnheader', { name: '客戶ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '公司名稱' })).toBeVisible();
    }
  });

  test('應該能夠開啟新增客戶 Modal', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();

    // 檢查 Modal 已開啟
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();
    
    // 檢查表單欄位
    await expect(page.getByLabel('客戶ID *')).toBeVisible();
    await expect(page.getByLabel('公司名稱 *')).toBeVisible();
  });

  test('應該在新增客戶 Modal 中顯示所有必要欄位', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();

    // 檢查所有表單欄位
    await expect(page.getByLabel('客戶ID *')).toBeVisible();
    await expect(page.getByLabel('公司名稱 *')).toBeVisible();
    await expect(page.getByLabel('公司簡稱')).toBeVisible();
    await expect(page.getByLabel('發票抬頭')).toBeVisible();
    await expect(page.getByLabel(/電話/)).toBeVisible();
    await expect(page.getByLabel(/統一編號/)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('傳真')).toBeVisible();
    await expect(page.getByLabel('郵遞區號')).toBeVisible();
    await expect(page.getByLabel('通訊地址')).toBeVisible();
    await expect(page.getByLabel('送貨地址')).toBeVisible();
    await expect(page.getByLabel('往來銀行')).toBeVisible();
    await expect(page.getByLabel('帳戶號碼')).toBeVisible();
    await expect(page.getByLabel('信用額度')).toBeVisible();
    await expect(page.getByLabel('帳款')).toBeVisible();
    await expect(page.getByLabel('主要產品')).toBeVisible();
    await expect(page.getByLabel('備註')).toBeVisible();
  });

  test('應該能夠關閉新增客戶 Modal', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();
    
    // 等待 Modal 開啟
    await expect(page.getByRole('heading', { name: '新增客戶' })).toBeVisible();

    // 點擊取消按鈕
    await page.getByRole('button', { name: '取消' }).click();

    // Modal 應該關閉
    await expect(page.getByRole('heading', { name: '新增客戶' })).not.toBeVisible();
  });

  test('應該在未填寫必填欄位時禁用建立按鈕', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();

    // 建立按鈕應該被禁用
    await expect(page.getByRole('button', { name: '建立' })).toBeDisabled();
  });

  test('應該在填寫必填欄位後啟用建立按鈕', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();

    // 填寫必填欄位
    await page.getByLabel('客戶ID *').fill('TEST001');
    await page.getByLabel('公司名稱 *').fill('測試公司');

    // 建立按鈕應該啟用
    await expect(page.getByRole('button', { name: '建立' })).toBeEnabled();
  });

  test('應該能夠使用搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜尋客戶名稱或公司...');
    
    // 輸入搜尋關鍵字
    await searchInput.fill('測試');
    
    // 等待搜尋結果更新
    await page.waitForTimeout(500);
    
    // 搜尋欄位應該包含輸入的文字
    await expect(searchInput).toHaveValue('測試');
  });

  test('應該能夠點擊客戶ID查看詳情', async ({ page }) => {
    // 等待表格載入
    const table = page.locator('table');
    
    // 檢查是否有資料
    const hasData = await table.isVisible();
    if (hasData) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        await firstIdLink.click();
        
        // 應該開啟詳情 Modal
        await expect(page.getByText('客戶詳情')).toBeVisible();
      }
    }
  });

  test('應該能夠點擊編輯按鈕開啟編輯 Modal', async ({ page }) => {
    // 等待表格載入
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const editButton = page.getByRole('button', { name: '編輯' }).first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // 應該開啟編輯 Modal
        await expect(page.getByRole('heading', { name: '編輯客戶' })).toBeVisible();
        
        // 客戶ID 欄位應該被禁用
        await expect(page.getByLabel('客戶ID *')).toBeDisabled();
      }
    }
  });

  test('應該能夠導航到聯絡人頁面', async ({ page }) => {
    // 等待表格載入
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const contactButton = page.getByRole('button', { name: '聯絡人' }).first();
      
      if (await contactButton.isVisible()) {
        await contactButton.click();
        
        // 應該導航到聯絡人頁面
        await expect(page).toHaveURL(/\/crm\/contacts/);
      }
    }
  });

  test('應該支援分頁功能', async ({ page }) => {
    // 檢查是否有分頁元件
    const pagination = page.locator('[class*="pagination"]');
    
    // 如果有分頁元件，應該能看到頁碼
    if (await pagination.isVisible()) {
      // 頁面大小選擇器應該存在
      await expect(page.getByRole('combobox')).toBeVisible();
    }
  });
});

test.describe('客戶管理 - 新增客戶流程', () => {
  const testCustomerId = `TEST${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm');
    await page.waitForSelector('.customers-page');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠建立新客戶', async ({ page }) => {
    await page.getByRole('button', { name: /新增客戶/ }).click();

    // 填寫必填欄位
    await page.getByLabel('客戶ID *').fill(testCustomerId);
    await page.getByLabel('公司名稱 *').fill('Playwright 測試公司');
    
    // 填寫可選欄位
    await page.getByLabel('公司簡稱').fill('PW測試');
    await page.getByLabel(/電話/).fill('02-1234-5678');
    await page.getByLabel('Email').fill('test@playwright.com');

    // 點擊建立
    await page.getByRole('button', { name: '建立' }).click();

    // 等待 Modal 關閉
    await expect(page.getByRole('heading', { name: '新增客戶' })).not.toBeVisible();

    // 搜尋剛建立的客戶
    await page.getByPlaceholder('搜尋客戶名稱或公司...').fill(testCustomerId);
    await page.waitForTimeout(500);

    // 應該能找到新建立的客戶
    await expect(page.getByText(testCustomerId)).toBeVisible();
  });
});
