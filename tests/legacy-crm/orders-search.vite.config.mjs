import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 只載入真實的舊版輸入畫面與其子元件；API 由 Playwright 攔截，不連資料庫。
export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1', port: 3199, strictPort: true },
});
