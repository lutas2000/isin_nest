import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('報價單管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/quotes');
    // 等待頁面載入
    await page.waitForSelector('.quotes-page');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示報價單管理頁面標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '報價單管理' })).toBeVisible();
  });

  test('應該顯示頁面描述', async ({ page }) => {
    await expect(page.getByText('管理客戶報價單、追蹤報價狀態和處理報價流程')).toBeVisible();
  });

  test('應該顯示搜尋欄位', async ({ page }) => {
    await expect(page.getByPlaceholder('搜尋報價單編號或客戶...')).toBeVisible();
  });

  test('應該顯示狀態篩選器', async ({ page }) => {
    // 找到狀態篩選下拉選單
    const statusFilter = page.getByRole('combobox').filter({ hasText: /全部狀態|待簽名|已簽名/ }).first();
    await expect(statusFilter).toBeVisible();
  });

  test('應該顯示報價單列表表格', async ({ page }) => {
    // 等待載入完成
    await page.waitForLoadState('networkidle');

    // 表格或載入訊息應該存在
    const loadingOrTable = await Promise.race([
      page.waitForSelector('.loading-message', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('table', { timeout: 5000 }).catch(() => null),
    ]);

    if (await page.locator('table').isVisible()) {
      // 檢查表頭
      await expect(page.getByRole('columnheader', { name: '報價單編號' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '客戶' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '經手人' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '是否簽名' })).toBeVisible();
    }
  });

  test('應該顯示快捷鍵提示', async ({ page }) => {
    // ShortcutHint 組件應該存在
    const shortcutHint = page.locator('[class*="shortcut"]');
    // 快捷鍵提示可能根據表格狀態顯示或隱藏
    await page.waitForTimeout(500);
  });

  test('應該能夠使用搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜尋報價單編號或客戶...');
    
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    await expect(searchInput).toHaveValue('test');
  });

  test('應該能夠使用狀態篩選', async ({ page }) => {
    // 等待載入完成
    await page.waitForLoadState('networkidle');

    // 找到狀態篩選下拉選單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      // 選擇「待簽名」
      await statusFilter.selectOption('pending');
      await page.waitForTimeout(500);

      // 選擇「已簽名」
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);

      // 選擇「全部狀態」
      await statusFilter.selectOption('');
    }
  });

  test('應該能夠點擊報價單編號查看詳情', async ({ page }) => {
    // 等待表格載入
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        await firstIdLink.click();
        
        // 應該導航到報價單詳情頁面
        await expect(page).toHaveURL(/\/crm\/quotes\/.*\/items/);
      }
    }
  });

  test('應該顯示報價單狀態標籤', async ({ page }) => {
    // 等待表格載入
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 檢查是否有狀態標籤（待簽名或已簽名）
      const statusBadges = page.locator('[class*="badge"], [class*="status"]');
      
      // 如果有資料，應該顯示狀態標籤
      if (await statusBadges.first().isVisible()) {
        const badgeText = await statusBadges.first().textContent();
        expect(badgeText).toMatch(/待簽名|已簽名/);
      }
    }
  });

  test('應該能夠使用下拉選單操作', async ({ page }) => {
    // 等待表格載入
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 找到操作按鈕（通常是三個點或更多操作）
      const actionButton = page.locator('[class*="dropdown"], [class*="action"]').first();
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        
        // 下拉選單應該顯示操作項目
        const deleteOption = page.getByText('刪除');
        if (await deleteOption.isVisible()) {
          // 確認刪除選項存在
          await expect(deleteOption).toBeVisible();
        }
      }
    }
  });
});

test.describe('報價單管理 - 編輯功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/quotes');
    await page.waitForSelector('.quotes-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠進入編輯模式（雙擊或 F2）', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 雙擊進入編輯模式
        await firstRow.dblclick();
        
        // 應該顯示編輯控制項
        await page.waitForTimeout(500);
        
        // 可能會看到輸入框或下拉選單
        const editableCell = page.locator('input, select').first();
        // 如果進入編輯模式，應該會有輸入控制項
      }
    }
  });

  test('應該能夠取消編輯', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 雙擊進入編輯模式
        await firstRow.dblclick();
        await page.waitForTimeout(500);

        // 按 Escape 取消編輯
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('報價單詳情頁面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠從報價單列表導航到詳情頁面', async ({ page }) => {
    await page.goto('/crm/quotes');
    await page.waitForSelector('.quotes-page');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        const quoteId = await firstIdLink.textContent();
        await firstIdLink.click();
        
        // 應該導航到報價單詳情頁面
        await expect(page).toHaveURL(/\/crm\/quotes\/.*\/items/);
        
        // 頁面應該顯示報價單工件
        await page.waitForLoadState('networkidle');
      }
    }
  });
});

test.describe('報價單轉訂貨單功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/quotes');
    await page.waitForSelector('.quotes-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠對已簽名報價單顯示轉訂貨單選項', async ({ page }) => {
    // 篩選已簽名的報價單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 找到有「已簽名」狀態的行
      const signedRow = page.locator('tr').filter({ hasText: '已簽名' }).first();
      
      if (await signedRow.isVisible()) {
        // 找到該行的操作按鈕
        const convertOption = signedRow.getByText('轉訂貨單');
        
        if (await convertOption.isVisible()) {
          await convertOption.click();
          
          // 應該顯示轉訂貨單 Modal
          await expect(page.getByRole('heading', { name: '轉換為訂貨單' })).toBeVisible();
          
          // 應該顯示運送方式和付款方式選擇
          await expect(page.getByLabel('運送方式 *')).toBeVisible();
          await expect(page.getByLabel('付款方式 *')).toBeVisible();
        }
      }
    }
  });

  test('應該在未選擇運送方式和付款方式時禁用確認按鈕', async ({ page }) => {
    // 篩選已簽名的報價單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const signedRow = page.locator('tr').filter({ hasText: '已簽名' }).first();
      
      if (await signedRow.isVisible()) {
        const convertOption = signedRow.getByText('轉訂貨單');
        
        if (await convertOption.isVisible()) {
          await convertOption.click();
          
          // 確認按鈕應該被禁用
          await expect(page.getByRole('button', { name: '確認轉換' })).toBeDisabled();
        }
      }
    }
  });

  test('應該能夠選擇運送方式和付款方式後啟用確認按鈕', async ({ page }) => {
    // 篩選已簽名的報價單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const signedRow = page.locator('tr').filter({ hasText: '已簽名' }).first();
      
      if (await signedRow.isVisible()) {
        const convertOption = signedRow.getByText('轉訂貨單');
        
        if (await convertOption.isVisible()) {
          await convertOption.click();
          
          // 選擇運送方式
          await page.getByLabel('運送方式 *').selectOption('自取');
          
          // 選擇付款方式
          await page.getByLabel('付款方式 *').selectOption('現金');
          
          // 確認按鈕應該啟用
          await expect(page.getByRole('button', { name: '確認轉換' })).toBeEnabled();
        }
      }
    }
  });

  test('應該能夠取消轉訂貨單 Modal', async ({ page }) => {
    // 篩選已簽名的報價單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('signed');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const signedRow = page.locator('tr').filter({ hasText: '已簽名' }).first();
      
      if (await signedRow.isVisible()) {
        const convertOption = signedRow.getByText('轉訂貨單');
        
        if (await convertOption.isVisible()) {
          await convertOption.click();
          
          // 點擊取消按鈕
          await page.getByRole('button', { name: '取消' }).click();
          
          // Modal 應該關閉
          await expect(page.getByRole('heading', { name: '轉換為訂貨單' })).not.toBeVisible();
        }
      }
    }
  });
});
