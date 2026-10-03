import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:4317' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ userName: 'Test', isAdmin: true, features: [] }));
  });
  await page.route('**/api/**', route => route.fulfill({ json: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } }));
});

test('HR has a separate navigation and legacy routes redirect', async ({ page }) => {
  await page.goto('/hr');
  await expect(page).toHaveURL(/\/hr\/staff$/);
  const nav = page.locator('.sidebar-nav');
  await expect(nav.getByText('員工管理', { exact: true })).toBeVisible();
  await expect(nav.getByText('銷售管理', { exact: true })).toHaveCount(0);
  await nav.getByText('返回營運管理').click();
  await expect(nav.getByText('銷售管理', { exact: true })).toBeVisible();
  await expect(nav.getByText('員工管理', { exact: true })).toHaveCount(0);
  await page.goto('/hr/leave');
  await expect(page).toHaveURL(/\/hr\/staff-vacation$/);
  await expect(page.getByText('請假申請', { exact: true })).toHaveCount(0);
  await page.goto('/staff/m70-users');
  await expect(page).toHaveURL(/\/hr\/m70-users$/);
});

test('attendance displays API records and failures clear the table', async ({ page }) => {
  await page.route('**/api/attend-record?*', route => route.fulfill({ json: {
    data: [{ id: 'test', staffId: 'E123', staffName: '測試員工', createTime: '2026-10-04T00:00:00Z', attendType: 1, inputType: 'card' }],
    total: 1, page: 1, limit: 50, totalPages: 1,
  } }));
  await page.goto('/hr/attendance');
  await expect(page.getByText('E123', { exact: true })).toBeVisible();
  await page.route('**/api/attend-record?*', route => route.fulfill({ status: 500, json: { message: '出勤服務暫時無法使用' } }));
  await page.getByRole('button', { name: '重新整理' }).click();
  await expect(page.getByText('出勤服務暫時無法使用').first()).toBeVisible();
  await expect(page.getByText('E123', { exact: true })).toHaveCount(0);
});

test('vacations load every API page and never fall back to fake data', async ({ page }) => {
  await page.route('**/api/staff-vacation?*', route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({ json: { data: [{ date: `2026-10-0${pageNumber}`, type: `測試假別${pageNumber}`, pay: true }], total: 2, page: pageNumber, limit: 1, totalPages: 2 } });
  });
  await page.goto('/hr/staff-vacation');
  await expect(page.getByRole('cell', { name: '測試假別2', exact: true })).toBeVisible();
  await page.route('**/api/staff-vacation?*', route => route.abort());
  await page.reload();
  await expect(page.getByText('Failed to fetch').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '國定假日', exact: true })).toHaveCount(0);
});

test('non-admin cannot open M70 through the old route', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auth_user', JSON.stringify({ userName: 'Staff', isAdmin: false, features: [] })));
  await page.goto('/staff/m70-users');
  await expect(page).toHaveURL('http://127.0.0.1:4317/');
  await page.goto('/hr/attendance');
  await expect(page.locator('.sidebar-nav').getByText('M70 員工對照')).toHaveCount(0);
});
