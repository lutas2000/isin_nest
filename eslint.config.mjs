// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
);