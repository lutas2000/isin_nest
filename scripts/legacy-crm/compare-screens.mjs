// 舊版銷管畫面比對：同一組操作分別在 isin_vb6 與 isin_nest /legacy-crm 執行，截圖後逐像素比較，
// 輸出兩張截圖與差異圖（紅色為不同的像素）。用於 LEGACY-CRM-REBUILD-PLAN.md 第 3、4 階段的
// 「與 isin_vb6 畫面逐窗比對」，做法見 docs/LEGACY-CRM-FRONTEND.md「驗證」。
//
// 兩邊要接同一份資料：isin_vb6 API 接由同一批 CSV 匯入的 SQLite，isin_nest 接測試資料庫
// （apps/backend/src/legacy-crm/dev/serve-legacy-crm.ts）。截圖含真實資料，預設寫到系統暫存
// 目錄，不要放進 Git。
//
//   LEGACY_VB6_URL=http://127.0.0.1:5174 LEGACY_NEST_URL=http://127.0.0.1:3101 \
//   LEGACY_NEST_USER=lc_admin LEGACY_NEST_PASSWORD=… \
//   node scripts/legacy-crm/compare-screens.mjs [場景…]
//
// 其他環境變數：LEGACY_COMPARE_OUT（輸出目錄）、LEGACY_COMPARE_CHANNEL（預設 chrome，
// 用本機 Chrome；設為空字串改用 Playwright 內建瀏覽器）。
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VB6_URL = process.env.LEGACY_VB6_URL ?? 'http://127.0.0.1:5174';
const NEST_URL = process.env.LEGACY_NEST_URL ?? 'http://127.0.0.1:3101';
const NEST_USER = process.env.LEGACY_NEST_USER ?? 'lc_admin';
const NEST_PASSWORD = process.env.LEGACY_NEST_PASSWORD;
const OUT =
  process.env.LEGACY_COMPARE_OUT ?? join(tmpdir(), 'legacy-crm-screens');
const CHANNEL = process.env.LEGACY_COMPARE_CHANNEL ?? 'chrome';
const VIEW = { width: 1280, height: 800 };

if (!NEST_PASSWORD) {
  console.error('請設定 LEGACY_NEST_PASSWORD（isin_nest 測試帳號的密碼）');
  process.exit(2);
}

async function openForm(page, menu, item) {
  await page.getByRole('button', { name: menu }).click();
  await page.getByRole('menuitem', { name: item }).click();
  await page.waitForTimeout(300);
}

async function press(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

async function focusField(page, index, key) {
  await page.locator('.legacy-master-field input').nth(index).focus();
  await page.keyboard.press(key);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

// 每個場景從剛開好的主視窗開始。第 4 階段在這裡加上單據與報表的場景。
const SCENES = {
  backdrop: async () => {},
  fileMenu: async (p) => {
    await p.getByRole('button', { name: '檔案(F)' }).click();
    await p.waitForTimeout(200);
  },
  customers: async (p) => {
    await openForm(p, '檔案(F)', '客戶建檔');
    await press(p, '頭筆 I');
  },
  customersNext: async (p) => {
    await openForm(p, '檔案(F)', '客戶建檔');
    await press(p, '頭筆 I');
    await press(p, '下筆 K');
    await press(p, '下筆 K');
  },
  customersLast: async (p) => {
    await openForm(p, '檔案(F)', '客戶建檔');
    await press(p, '尾筆 M');
  },
  customerQuery: async (p) => {
    await openForm(p, '檔案(F)', '客戶建檔');
    await press(p, '頭筆 I');
    await press(p, '查詢 R');
  },
  suppliers: async (p) => {
    await openForm(p, '檔案(F)', '廠商建檔');
    await press(p, '頭筆 I');
  },
  supplierExpand: async (p) => {
    await openForm(p, '檔案(F)', '廠商建檔');
    await press(p, '頭筆 I');
    await focusField(p, 1, 'F12');
  },
  parts: async (p) => {
    await openForm(p, '檔案(F)', '工件建檔');
    await press(p, '尾筆 M');
  },
  partSales: async (p) => {
    await openForm(p, '檔案(F)', '工件建檔');
    await press(p, '尾筆 M');
    await press(p, '出貨記錄');
  },
  partCustomerAssist: async (p) => {
    await openForm(p, '檔案(F)', '工件建檔');
    await press(p, '尾筆 M');
    await focusField(p, 1, 'F1');
  },
  materials: async (p) => {
    await openForm(p, '檔案(F)', '材質建檔');
    await press(p, '頭筆 I');
  },
  banks: async (p) => {
    await openForm(p, '檔案(F)', '銀行建檔');
    await press(p, '頭筆 I');
  },
  phrases: async (p) => {
    await openForm(p, '檔案(F)', '詞彙資料');
    await press(p, '頭筆 I');
  },
  postal: async (p) => {
    await openForm(p, '檔案(F)', '郵遞區號');
    await press(p, '頭筆 I');
  },
  cascade: async (p) => {
    await openForm(p, '檔案(F)', '客戶建檔');
    await press(p, '頭筆 I');
    await openForm(p, '檔案(F)', '材質建檔');
    await press(p, '頭筆 I');
    await openForm(p, '視窗(W)', '梯式排列');
  },
};

const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});

async function vb6Page() {
  const context = await browser.newContext({ viewport: VIEW });
  const page = await context.newPage();
  await page.goto(VB6_URL);
  await page.waitForSelector('.legacy-menubar');
  return page;
}

async function nestPage() {
  const response = await fetch(`${NEST_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userName: NEST_USER, password: NEST_PASSWORD }),
  });
  if (!response.ok) throw new Error(`isin_nest 登入失敗（${response.status}）`);
  const login = await response.json();
  const context = await browser.newContext({ viewport: VIEW });
  await context.addInitScript(
    ([token, user]) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', user);
    },
    [login.access_token, JSON.stringify(login.user)],
  );
  const page = await context.newPage();
  await page.goto(`${NEST_URL}/legacy-crm`);
  await page.waitForSelector('.legacy-menubar');
  return page;
}

// 在瀏覽器的 canvas 逐像素比較，回傳不同的像素數與範圍，並寫出差異圖。
async function diff(a, b, file) {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ([a, b]) => {
      const load = (src) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.src = src;
        });
      const [imageA, imageB] = await Promise.all([load(a), load(b)]);
      const width = imageA.width;
      const height = imageA.height;
      const pixels = (image) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height).data;
      };
      const da = pixels(imageA);
      const db = pixels(imageB);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      const out = context.createImageData(width, height);
      let count = 0;
      let box = null;
      for (let i = 0; i < da.length; i += 4) {
        const same =
          da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2];
        if (same) {
          const grey = 200 + (da[i] + da[i + 1] + da[i + 2]) / 15;
          out.data[i] = out.data[i + 1] = out.data[i + 2] = grey;
        } else {
          out.data[i] = 255;
          count += 1;
          const x = (i / 4) % width;
          const y = Math.floor(i / 4 / width);
          box = box
            ? [
                Math.min(box[0], x),
                Math.min(box[1], y),
                Math.max(box[2], x),
                Math.max(box[3], y),
              ]
            : [x, y, x, y];
        }
        out.data[i + 3] = 255;
      }
      context.putImageData(out, 0, 0);
      return { count, box, png: canvas.toDataURL('image/png') };
    },
    [a, b],
  );
  await page.close();
  writeFileSync(file, Buffer.from(result.png.split(',')[1], 'base64'));
  return { count: result.count, box: result.box };
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const [name, scene] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  const vb6 = await vb6Page();
  await scene(vb6);
  const nest = await nestPage();
  await scene(nest);
  const shotVb6 = await vb6.screenshot();
  const shotNest = await nest.screenshot();
  writeFileSync(join(OUT, `${name}-vb6.png`), shotVb6);
  writeFileSync(join(OUT, `${name}-nest.png`), shotNest);
  const result = await diff(
    `data:image/png;base64,${shotVb6.toString('base64')}`,
    `data:image/png;base64,${shotNest.toString('base64')}`,
    join(OUT, `${name}-diff.png`),
  );
  console.log(
    name.padEnd(20),
    result.count
      ? `${result.count} 像素不同，範圍 ${result.box.join(',')}`
      : '相同',
  );
  await vb6.context().close();
  await nest.context().close();
}
await browser.close();
console.log(`截圖：${OUT}`);
