import { Page } from '@playwright/test';

/**
 * 測試用帳號憑證
 */
export const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'a123456',
};

/**
 * 執行登入操作
 * @param page Playwright Page 物件
 * @param username 用戶名（預設為測試帳號）
 * @param password 密碼（預設為測試密碼）
 */
export async function login(
  page: Page,
  username: string = TEST_CREDENTIALS.username,
  password: string = TEST_CREDENTIALS.password
): Promise<void> {
  await page.goto('/login');
  
  // 等待登入表單載入
  await page.waitForSelector('form');
  
  // 填寫登入表單
  await page.getByLabel('用戶名').fill(username);
  await page.getByLabel('密碼').fill(password);
  
  // 點擊登入按鈕
  await page.getByRole('button', { name: '登入' }).click();
  
  // 等待登入完成並導向首頁
  await page.waitForURL('/');
}

/**
 * 檢查是否已登入
 * @param page Playwright Page 物件
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return token !== null;
}

/**
 * 執行登出操作
 * @param page Playwright Page 物件
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  });
}

/**
 * 確保已登入狀態（如果未登入則執行登入）
 * @param page Playwright Page 物件
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    await login(page);
  }
}
