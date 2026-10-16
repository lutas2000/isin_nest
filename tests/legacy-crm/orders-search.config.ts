import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: 'orders-search.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  metadata: { ordersSearchFixture: true },
  use: {
    baseURL: 'http://127.0.0.1:3199',
    viewport: { width: 1280, height: 800 },
    ...(process.env.LEGACY_CRM_E2E_CHANNEL
      ? { channel: process.env.LEGACY_CRM_E2E_CHANNEL }
      : {}),
  },
  webServer: {
    cwd: resolve(__dirname, '../..'),
    command:
      'node_modules/.bin/vite --config tests/legacy-crm/orders-search.vite.config.mjs',
    url: 'http://127.0.0.1:3199/tests/fixtures/legacy-orders.html',
    reuseExistingServer: false,
  },
});
