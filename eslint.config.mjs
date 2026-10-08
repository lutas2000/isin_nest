// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ── 新舊版 CRM 互不引用（docs/LEGACY-CRM-REBUILD-PLAN.md 第 0、6 節）──────────────
// eslint-plugin-import 沒有安裝，用內建的 no-restricted-imports（比對 import 字串，
// gitignore 語法、不分大小寫）＋ no-restricted-syntax（動態 import()）達到 no-restricted-paths 的效果。
const NEW_CRM_IMPORTS = [
  '**/views/CRM',
  '**/views/Accounting',
  '**/services/crm',
  '**/router/crm-v2',
  './crm-v2',
  '**/config/crmV2',
];
const LEGACY_CRM_IMPORTS = ['**/legacy-crm', './legacy-crm'];
const BACKEND_NEW_CRM_IMPORTS = ['**/crm'];
const BACKEND_LEGACY_CRM_IMPORTS = ['**/legacy-crm'];

// no-restricted-syntax 的 selector 用 esquery 的 /regex/，裡面不能有 `/`，斜線寫成 \u002F。
const toRegex = (patterns) =>
  patterns
    .map(
      (p) =>
        p.replace(/^\*\*\//, '(^|/)').replace(/^\.\//, '^\\./').replaceAll('/', '\\u002F') +
        '(\\u002F|$)',
    )
    .join('|');

const crmBoundary = (patterns, message) => ({
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportExpression > Literal[value=/${toRegex(patterns)}/i]`,
        message,
      },
    ],
  },
});

/**
 * 專案沒有 vue-eslint-parser，.vue 原本不經過 ESLint。這個 processor 只把 <script> 內的
 * import 來源（`from '…'`、`import '…'`、`import('…')`）原行號抽成 `import '…';`，
 * 並且只回報 no-restricted-imports，讓上面的邊界規則也涵蓋 .vue，其他規則不套用。
 */
const vueImportsOnly = {
  meta: { name: 'vue-imports-only' },
  supportsAutofix: false,
  preprocess(text) {
    const lines = text.split('\n').map(() => '');
    const lineAt = (offset) => text.slice(0, offset).split('\n').length - 1;
    for (const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      const bodyStart = script.index + script[0].indexOf('>') + 1;
      const sources = /\b(?:from|import)\s*\(?\s*(['"])([^'"\n]+)\1/g;
      for (const m of script[1].matchAll(sources)) {
        lines[lineAt(bodyStart + m.index)] += `import ${JSON.stringify(m[2])};`;
      }
    }
    return [{ text: lines.join('\n'), filename: 'imports.js' }];
  },
  postprocess: (messages) =>
    messages.flat().filter((m) => m.ruleId === 'no-restricted-imports'),
};

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/webpack.config.js',
      '**/vite.config.*',
      '**/jest.config.ts',
      '**/tsconfig*.json',
      '**/*.d.ts',
      'eslint.config.fast.mjs',
    ],
  },
  eslint.configs.recommended,
  // 只用非型別版的 recommended；需要型別資訊的規則在下面逐條開啟
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    // TypeScript 檔案提供型別資訊，否則 no-floating-promises、no-unsafe-argument 這類
    // typed rule 會直接拋 "You have used a rule which requires type information"。
    // 不用 projectService：後端 tsconfig.json 排除 *.spec.ts，spec 要靠 tsconfig.spec.json 才找得到。
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: [
          'apps/backend/tsconfig.json',
          'apps/backend/tsconfig.spec.json',
          'apps/frontend/tsconfig.json',
          'apps/frontend/tsconfig.node.json',
          'tsconfig.scripts.json',
        ],
      },
    },
  },
  {
    // JS 設定檔沒有 tsconfig，關閉 typed rules
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // 程式碼從未以 prettier 格式化過（後端 168 檔、前端 33 檔不符），先降為警告，
      // 等跑過 `npm run format` 再改回 error。
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'semi': 'off',
      // 關閉一些耗資源的規則
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off'
    },
  },
  {
    files: ['apps/frontend/src/**/*.vue'],
    processor: vueImportsOnly,
  },
  {
    // processor 抽出的虛擬檔（X.vue/0_imports.js）沒有型別資訊，關掉 typed rules
    files: ['apps/frontend/src/**/*.vue/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // 舊版銷管不可引用新版 CRM
    files: [
      'apps/frontend/src/legacy-crm/**/*.{ts,js}',
      'apps/frontend/src/router/legacy-crm.ts',
    ],
    ...crmBoundary(
      NEW_CRM_IMPORTS,
      '舊版銷管（legacy-crm）不可引用新版 CRM（views/CRM、services/crm、router/crm-v2…），見 LEGACY-CRM-REBUILD-PLAN.md 第 6 節。',
    ),
  },
  {
    // 新版 CRM（暫不使用）不可引用舊版銷管
    files: [
      'apps/frontend/src/views/CRM/**/*.{ts,js}',
      'apps/frontend/src/views/Accounting/**/*.{ts,js}',
      'apps/frontend/src/services/crm/**/*.{ts,js}',
      'apps/frontend/src/router/crm-v2.ts',
    ],
    ...crmBoundary(
      LEGACY_CRM_IMPORTS,
      '新版 CRM 不可引用舊版銷管（legacy-crm），見 LEGACY-CRM-REBUILD-PLAN.md 第 6 節。',
    ),
  },
  {
    files: ['apps/backend/src/legacy-crm/**/*.ts'],
    ...crmBoundary(
      BACKEND_NEW_CRM_IMPORTS,
      '後端 legacy-crm 不可引用新版 CRM 模組（src/crm），見 LEGACY-CRM-REBUILD-PLAN.md 第 6 節。',
    ),
  },
  {
    files: ['apps/backend/src/crm/**/*.ts'],
    ...crmBoundary(
      BACKEND_LEGACY_CRM_IMPORTS,
      '後端新版 CRM 不可引用 legacy-crm，見 LEGACY-CRM-REBUILD-PLAN.md 第 6 節。',
    ),
  },
);
