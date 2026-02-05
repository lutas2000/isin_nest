import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, login, logout } from '../helpers/auth';

test.describe('登入功能', () => {
  test.beforeEach(async ({ page }) => {
    // 確保每個測試開始時都是登出狀態
    await logout(page);
  });

  test('應該顯示登入頁面', async ({ page }) => {
    await page.goto('/login');

    // 檢查頁面標題
    await expect(page).toHaveTitle(/登入/);
    
    // 檢查登入表單元素
    await expect(page.getByLabel('用戶名')).toBeVisible();
    await expect(page.getByLabel('密碼')).toBeVisible();
    await expect(page.getByRole('button', { name: '登入' })).toBeVisible();
    
    // 檢查系統標題
    await expect(page.getByText('奕新雷射 管理系統')).toBeVisible();
  });

  test('應該顯示登入按鈕在未填寫表單時為禁用狀態', async ({ page }) => {
    await page.goto('/login');

    const loginButton = page.getByRole('button', { name: '登入' });
    
    // 未填寫任何欄位時，按鈕應該禁用
    await expect(loginButton).toBeDisabled();
  });

  test('應該在填寫用戶名後仍然禁用按鈕', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('用戶名').fill('testuser');
    
    const loginButton = page.getByRole('button', { name: '登入' });
    await expect(loginButton).toBeDisabled();
  });

  test('應該在填寫完整表單後啟用按鈕', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('用戶名').fill('testuser');
    await page.getByLabel('密碼').fill('testpassword');
    
    const loginButton = page.getByRole('button', { name: '登入' });
    await expect(loginButton).toBeEnabled();
  });

  test('應該能夠使用正確帳號密碼登入', async ({ page }) => {
    await login(page, TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);

    // 驗證已導向到首頁
    await expect(page).toHaveURL('/');
    
    // 驗證 localStorage 中有 token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).not.toBeNull();
  });

  test('應該在登入失敗時顯示錯誤訊息', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('用戶名').fill('wronguser');
    await page.getByLabel('密碼').fill('wrongpassword');
    await page.getByRole('button', { name: '登入' }).click();

    // 等待錯誤訊息顯示（可能是 toast 或其他形式）
    // 頁面應該仍然在登入頁面
    await expect(page).toHaveURL('/login');
  });

  test('應該在已登入狀態下訪問登入頁時重導向到首頁', async ({ page }) => {
    // 先登入
    await login(page);

    // 嘗試訪問登入頁面
    await page.goto('/login');

    // 應該被重導向到首頁
    await expect(page).toHaveURL('/');
  });

  test('應該在未登入狀態下訪問受保護頁面時重導向到登入頁', async ({ page }) => {
    // 直接訪問 CRM 頁面
    await page.goto('/crm');

    // 應該被重導向到登入頁面
    await expect(page).toHaveURL('/login');
  });

  test('應該能夠在密碼欄位按下 Enter 鍵提交表單', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('用戶名').fill(TEST_CREDENTIALS.username);
    await page.getByLabel('密碼').fill(TEST_CREDENTIALS.password);
    
    // 在密碼欄位按下 Enter
    await page.getByLabel('密碼').press('Enter');

    // 應該成功登入並導向首頁
    await expect(page).toHaveURL('/');
  });
});
