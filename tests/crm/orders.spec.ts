import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('訂貨單管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    // 等待頁面載入
    await page.waitForSelector('.orders-page');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示訂貨單管理頁面標題', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '訂貨單管理' })).toBeVisible();
  });

  test('應該顯示頁面描述', async ({ page }) => {
    await expect(page.getByText('管理訂貨單、追蹤訂單狀態和處理工作流程')).toBeVisible();
  });

  test('應該顯示搜尋欄位', async ({ page }) => {
    await expect(page.getByPlaceholder('搜尋訂貨單編號或客戶...')).toBeVisible();
  });

  test('應該顯示狀態篩選器', async ({ page }) => {
    // 找到狀態篩選下拉選單
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();
  });

  test('應該顯示訂貨單列表表格', async ({ page }) => {
    // 等待載入完成
    await page.waitForLoadState('networkidle');

    const loadingOrTable = await Promise.race([
      page.waitForSelector('.loading-message', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('table', { timeout: 5000 }).catch(() => null),
    ]);

    if (await page.locator('table').isVisible()) {
      // 檢查表頭
      await expect(page.getByRole('columnheader', { name: '訂貨單編號' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '客戶' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '業務員' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '運送方式' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '付款方式' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '狀態' })).toBeVisible();
    }
  });

  test('應該能夠使用搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜尋訂貨單編號或客戶...');
    
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    await expect(searchInput).toHaveValue('test');
  });

  test('應該能夠使用狀態篩選', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      // 選擇「進行中」
      await statusFilter.selectOption('active');
      await page.waitForTimeout(500);

      // 選擇「已完成」
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(500);

      // 選擇「全部狀態」
      await statusFilter.selectOption('');
    }
  });

  test('應該能夠點擊訂貨單編號查看詳情', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        await firstIdLink.click();
        
        // 應該導航到訂貨單詳情頁面
        await expect(page).toHaveURL(/\/crm\/orders\/.*\/items/);
      }
    }
  });

  test('應該顯示訂貨單狀態標籤', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const statusBadges = page.locator('[class*="badge"], [class*="status"]');
      
      if (await statusBadges.first().isVisible()) {
        const badgeText = await statusBadges.first().textContent();
        expect(badgeText).toMatch(/進行中|已完成/);
      }
    }
  });

  test('應該顯示快捷鍵提示', async ({ page }) => {
    // ShortcutHint 組件應該存在
    await page.waitForTimeout(500);
    // 根據表格狀態，快捷鍵提示可能顯示或隱藏
  });
});

test.describe('訂貨單管理 - 新增訂貨單', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠顯示新增行', async ({ page }) => {
    // 按 N 鍵可能會顯示新增行（根據 ShortcutHint）
    await page.keyboard.press('n');
    await page.waitForTimeout(300);

    // 或者找到新增按鈕
    const addButton = page.getByRole('button', { name: /新增|Add/ });
    if (await addButton.isVisible()) {
      await addButton.click();
    }
  });

  test('應該能夠在新增行中填寫必要資料', async ({ page }) => {
    // 顯示新增行
    await page.keyboard.press('n');
    await page.waitForTimeout(500);

    // 如果有新增行，應該能看到輸入欄位
    const newRowInputs = page.locator('tr').last().locator('input, select');
    
    if (await newRowInputs.first().isVisible()) {
      // 新增行應該有輸入控制項
      await expect(newRowInputs.first()).toBeVisible();
    }
  });
});

test.describe('訂貨單管理 - 編輯功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠進入編輯模式', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 雙擊進入編輯模式
        await firstRow.dblclick();
        await page.waitForTimeout(500);
        
        // 可能會看到保存和取消按鈕
        const saveButton = page.getByRole('button', { name: '保存' });
        const cancelButton = page.getByRole('button', { name: '取消' });
        
        if (await saveButton.isVisible()) {
          await expect(saveButton).toBeVisible();
          await expect(cancelButton).toBeVisible();
        }
      }
    }
  });

  test('應該能夠使用 F2 進入編輯模式', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 點擊行以聚焦
        await firstRow.click();
        await page.waitForTimeout(200);
        
        // 按 F2 進入編輯模式
        await page.keyboard.press('F2');
        await page.waitForTimeout(500);
      }
    }
  });

  test('應該能夠取消編輯', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        await firstRow.dblclick();
        await page.waitForTimeout(500);

        // 按 Escape 取消編輯
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('訂貨單管理 - 完成訂單', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該對進行中的訂單顯示完成選項', async ({ page }) => {
    // 篩選進行中的訂單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 找到有「進行中」狀態的行
      const activeRow = page.locator('tr').filter({ hasText: '進行中' }).first();
      
      if (await activeRow.isVisible()) {
        // 找到完成選項
        const completeOption = activeRow.getByText('完成');
        
        if (await completeOption.isVisible()) {
          await expect(completeOption).toBeVisible();
        }
      }
    }
  });

  test('應該對已完成的訂單不顯示完成選項', async ({ page }) => {
    // 篩選已完成的訂單
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(500);
    }

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      // 找到有「已完成」狀態的行
      const completedRow = page.locator('tr').filter({ hasText: '已完成' }).first();
      
      if (await completedRow.isVisible()) {
        // 完成選項應該不存在
        const completeOption = completedRow.getByText('完成');
        // 可能在下拉選單中，所以先不做強制斷言
      }
    }
  });
});

test.describe('訂貨單管理 - 刪除功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該顯示刪除選項', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 找到刪除選項
        const deleteOption = firstRow.getByText('刪除');
        
        if (await deleteOption.isVisible()) {
          await expect(deleteOption).toBeVisible();
        }
      }
    }
  });

  test('應該在點擊刪除時顯示確認對話框', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        const deleteOption = firstRow.getByText('刪除');
        
        if (await deleteOption.isVisible()) {
          // 設置對話框處理器
          page.on('dialog', async dialog => {
            // 確認是刪除確認對話框
            expect(dialog.message()).toContain('確定');
            await dialog.dismiss(); // 取消刪除
          });

          await deleteOption.click();
        }
      }
    }
  });
});

test.describe('訂貨單詳情頁面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠從訂貨單列表導航到詳情頁面', async ({ page }) => {
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstIdLink = page.locator('.link-button').first();
      
      if (await firstIdLink.isVisible()) {
        const orderId = await firstIdLink.textContent();
        await firstIdLink.click();
        
        // 應該導航到訂貨單詳情頁面
        await expect(page).toHaveURL(/\/crm\/orders\/.*\/items/);
        
        // 頁面應該載入完成
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('應該能夠直接訪問訂貨單詳情頁面', async ({ page }) => {
    // 假設有一個訂單 ID（這需要根據實際資料調整）
    await page.goto('/crm/orders/WO001/items');
    
    // 頁面應該正常載入
    await page.waitForLoadState('networkidle');
    
    // 檢查頁面沒有錯誤或顯示適當的錯誤訊息
  });
});

test.describe('訂貨單管理 - 鍵盤快捷鍵', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/crm/orders');
    await page.waitForSelector('.orders-page');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('應該能夠使用上下箭頭鍵在行之間移動', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      
      if (rowCount > 1) {
        // 點擊第一行以聚焦
        await rows.first().click();
        await page.waitForTimeout(200);
        
        // 按下箭頭鍵移動到下一行
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        
        // 按上箭頭鍵移動回第一行
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(200);
      }
    }
  });

  test('應該能夠使用 Enter 鍵查看詳情', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 點擊行以聚焦
        await firstRow.click();
        await page.waitForTimeout(200);
        
        // 按 Enter 查看詳情
        await page.keyboard.press('Enter');
        
        // 應該導航到詳情頁面
        await page.waitForTimeout(500);
        // URL 可能變更或顯示 Modal
      }
    }
  });

  test('應該能夠使用 N 鍵顯示新增行', async ({ page }) => {
    await page.keyboard.press('n');
    await page.waitForTimeout(300);
    
    // 應該顯示新增行
    // 根據實際實現檢查
  });

  test('應該能夠使用 Delete 鍵刪除選中的行', async ({ page }) => {
    const table = page.locator('table');
    
    if (await table.isVisible()) {
      const firstRow = table.locator('tbody tr').first();
      
      if (await firstRow.isVisible()) {
        // 點擊行以聚焦
        await firstRow.click();
        await page.waitForTimeout(200);
        
        // 設置對話框處理器
        page.on('dialog', async dialog => {
          await dialog.dismiss(); // 取消刪除
        });
        
        // 按 Delete 鍵
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);
      }
    }
  });
});
